// ══════════════════════════════════════════════════════════════════════
//  Nicoco — Requirement Definition：基礎電商（ecom）v1
//
//  職責分工：
//    FEATURES / calcPrice（index.html） ＝ 這個功能「怎麼計價」
//    本檔 Requirement Definition          ＝ 客戶「實際需要什麼」
//
//  本檔「不保存任何價格」。每個需求節點只會宣告 pricing.mode：
//    base     ＝ 已含於 ecom 基礎方案（ecom-base / TYPE_CONFIG.ecom.included），不另計價
//    feature  ＝ 指向既有 FEATURES 的 group + id，由既有 calcPrice 計價（同一 key 只計一次）
//    evaluate ＝ 目前沒有既有 pricing key，且明顯增加開發工作，需人工確認
//    none     ＝ 只記錄需求，不直接影響價格
//
//  載入頁面：
//    index.html        → 客戶填寫／render／產生 requirementSnapshot
//    quote-detail.html → 只使用 renderSnapshotHtml() 唯讀顯示 Snapshot
//                        （Snapshot 自帶 label／顯示資料，不依賴本檔的定義內容）
// ══════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var DEFINITION_VERSION = 'ecom-v1.0.0';
  var PROJECT_TYPE_KEY = 'ecom';

  // ── 責任類型 ──────────────────────────────────────────────────────────
  var RESPONSIBILITY_LABELS = {
    website: '網站本體功能（由開發方開發）',
    client_account: '第三方服務由客戶自行申請／持有帳號，提供必要權限後由開發方進行網站技術設定或串接',
    developer_setup_handover: '開發期間由開發方建立與設定，正式交付時依平台能力完成所有權／管理權限交接',
  };
  var RESPONSIBILITY_SHORT = {
    website: '網站開發',
    client_account: '客戶自有帳號',
    developer_setup_handover: '開發方建立・交付時移交',
  };

  // ── 第三方服務表（責任歸屬放在這裡，不寫進 FEATURES）──────────────────
  var THIRD_PARTY_SERVICES = {
    payment_gateway: {
      label: '第三方金流（例如綠界 ECPay／藍新 NewebPay）',
      responsibilityType: 'client_account',
      note: '金流商家帳號由客戶申請與持有；交易手續費由客戶負擔。網站負責技術串接。',
    },
    logistics_provider: {
      label: '第三方物流／超商取貨服務',
      responsibilityType: 'client_account',
      note: '物流商家資格由客戶申請與持有；網站負責技術串接。',
    },
    einvoice_provider: {
      label: '電子發票平台',
      responsibilityType: 'client_account',
      note: '電子發票平台帳號與稅籍設定由客戶申請與持有；網站負責技術串接。',
    },
    firebase: {
      label: 'Firebase（資料庫／會員驗證／儲存）',
      responsibilityType: 'developer_setup_handover',
      note: '開發期間由開發方建立與設定，交付時移交管理權限；超出免費額度之用量費用由客戶負擔。',
    },
    email_service: {
      label: 'Email 寄信服務（例如 Resend）',
      responsibilityType: 'developer_setup_handover',
      note: '開發期間由開發方建立與設定，交付時移交；寄信服務本身費用由客戶負擔。',
    },
    line_login: {
      label: 'LINE Login（LINE Developers）',
      responsibilityType: 'client_account',
      note: '原則上由客戶持有 LINE Developers 相關帳號／Channel；實際所需條件依 LINE 平台當時要求確認。',
    },
    apple_login: {
      label: 'Sign in with Apple（Apple Developer）',
      responsibilityType: 'client_account',
      note: '原則上由客戶持有 Apple Developer 帳號；實際所需條件依 Apple 平台當時要求確認。',
    },
  };

  // ── 共用小工具（定義用）───────────────────────────────────────────────
  var BASE = { mode: 'base' };
  var NONE = { mode: 'none' };
  function EVAL(reason) { return { mode: 'evaluate', reason: reason || '' }; }
  function FEAT(group, id) { return { mode: 'feature', group: group, id: id }; }
  var REQ_MEMBER = { type: 'feature', group: 'member', id: 'register', label: '會員系統' };

  function has(arr, v) { return Array.isArray(arr) && arr.indexOf(v) !== -1; }

  // ══════════════════════════════════════════════════════════════════════
  //  Requirement Tree（六大區塊皆為「方案已包含／需求確認」，不可取消）
  //
  //  節點型別：
  //    check  ＝ 單一可勾選需求；勾選後才顯示 children（conditional questions）
  //    single ＝ 單選題（options）；選項可帶 pricing / thirdParty / requires / children
  //    multi  ＝ 複選題（options）
  //    text   ＝ 自由文字
  //  其他欄位：
  //    stateKey    ＝ 多個節點共用同一個回答（例如商品區與會員區的「收藏商品」）
  //    requires    ＝ dependency；未滿足時該項停用並顯示提示，不會自動代客勾選
  //    pricingRule ＝ 依子問題回答決定 pricing（例如商品規格）
  // ══════════════════════════════════════════════════════════════════════
  var CATEGORIES = [
    // ─────────────────────────── 商品系統 ───────────────────────────
    {
      key: 'product', label: '商品系統',
      baseIncludes: ['商品新增／編輯／刪除', '商品名稱、介紹、價格', '商品圖片', '商品分類', '商品列表頁', '商品詳細頁', '商品上下架'],
      notes: ['基礎方案適用範圍：單一語系、商品數量 50 項以內、簡易單層規格選項。'],
      items: [
        {
          key: 'product.inventory', label: '庫存管理', type: 'check', pricing: BASE,
          hint: '記錄商品庫存數量；庫存為 0 時不可購買，且購買數量不會超過可售庫存。',
          children: [
            {
              key: 'product.inventory.soldOut', label: '庫存為 0 時，商品如何呈現？', type: 'single',
              options: [
                { value: 'show_soldout', label: '保留商品頁，顯示售完並禁止購買' },
                { value: 'hide_buy', label: '保留商品頁，但隱藏購買／價格' },
                { value: 'hide_from_list', label: '不在商品列表顯示' },
                { value: 'other', label: '其他', other: true },
              ],
            },
            {
              key: 'product.inventory.advanced', label: '需要進階庫存（安全庫存警示、多倉庫存、補貨提醒）',
              type: 'check', pricing: FEAT('ecom', 'inventory-adv'),
            },
          ],
        },
        {
          key: 'product.variants', label: '商品規格／款式', type: 'check',
          hint: '例如顏色、尺寸、容量等可供顧客選擇的規格。',
          // 依既有 FEATURES.variants 的定義：
          //   「多維度規格組合（例如顏色 × 尺寸），且各組合需獨立 SKU、價格或庫存管理」才屬加購。
          // 基礎方案已含「簡易單層規格選項」。定義無法明確涵蓋的情況一律 evaluate／只記錄，不擴大收費範圍。
          pricingRule: function (get) {
            var structure = get('product.variants.structure');
            var affects = get('product.variants.affects') || [];
            var independent = has(affects, 'price') || has(affects, 'stock') || has(affects, 'sku');
            if (structure === 'multi_combo') {
              return independent ? FEAT('ecom', 'variants') : NONE;
            }
            if (structure === 'single_layer') {
              return independent
                ? EVAL('單層規格但各選項需獨立價格／庫存／商品編號，既有計價定義未明確涵蓋')
                : BASE;
            }
            if (structure === 'unsure') return EVAL('規格型態尚未確定');
            return NONE; // 尚未回答規格型態：只記錄
          },
          children: [
            {
              key: 'product.variants.structure', label: '規格型態', type: 'single',
              options: [
                { value: 'single_layer', label: '簡易規格選項（例如顏色、尺寸各自一層，不需各組合獨立管理）' },
                { value: 'multi_combo', label: '多維度規格組合（例如顏色 × 尺寸，每個組合是獨立品項）' },
                { value: 'unsure', label: '不確定' },
              ],
            },
            {
              key: 'product.variants.affects', label: '規格是否會影響以下項目？（可複選）', type: 'multi',
              options: [
                { value: 'price', label: '價格' },
                { value: 'stock', label: '庫存' },
                { value: 'image', label: '圖片' },
                { value: 'sku', label: '商品編號／SKU' },
                { value: 'other', label: '其他', other: true },
              ],
            },
          ],
        },
        { key: 'product.multiImages', label: '多張商品圖片', type: 'check', pricing: BASE },
        { key: 'product.video', label: '商品影片', type: 'check', pricing: EVAL('商品影片（嵌入或上傳）不在基礎電商模組定義內') },
        {
          key: 'product.search', label: '商品搜尋', type: 'check', pricing: EVAL('商品搜尋不在基礎電商模組定義內'),
          children: [
            {
              key: 'product.search.scope', label: '希望可以搜尋哪些內容？（可複選）', type: 'multi',
              options: [
                { value: 'name', label: '商品名稱' },
                { value: 'category', label: '商品分類' },
                { value: 'description', label: '商品描述' },
                { value: 'brand', label: '品牌' },
                { value: 'sku', label: '型號／SKU' },
                { value: 'other', label: '其他', other: true },
              ],
            },
          ],
        },
        { key: 'product.sortFilter', label: '商品排序／篩選', type: 'check', pricing: EVAL('商品排序／篩選不在基礎電商模組定義內') },
        { key: 'product.tags', label: '商品標籤', type: 'check', pricing: EVAL('基礎方案僅含基本商品分類，商品標籤需另行確認') },
        { key: 'product.reviews', label: '商品評價', type: 'check', pricing: FEAT('ecom', 'reviews') },
        {
          key: 'product.wishlist', label: '收藏商品', type: 'check', pricing: FEAT('member', 'wishlist'),
          requires: [REQ_MEMBER],
        },
        { key: 'product.other', label: '其他商品需求', type: 'text', placeholder: '例如：預購、組合商品、限購數量…' },
      ],
    },

    // ─────────────────────────── 購物車 ───────────────────────────
    {
      key: 'cart', label: '購物車',
      baseIncludes: ['加入購物車', '查看購物車', '修改商品數量', '移除商品', '商品小計／訂單金額', '前往結帳'],
      notes: ['優惠碼／折扣碼不包含於基本購物車。如需要，請於下一步「其他功能／加購」選擇「優惠券 / 折扣碼」。'],
      items: [
        { key: 'cart.guest', label: '未登入也可使用購物車', type: 'check', pricing: BASE },
        { key: 'cart.keepAfterLogin', label: '登入後保留購物車', type: 'check', pricing: BASE, requires: [REQ_MEMBER] },
        {
          key: 'cart.crossDevice', label: '跨裝置保存購物車', type: 'check',
          pricing: EVAL('跨裝置同步需將購物車保存於會員帳號，超出基本購物車狀態保存'),
          requires: [REQ_MEMBER],
        },
        {
          key: 'cart.stockStatus', label: '購物車顯示庫存狀態', type: 'check', pricing: BASE,
          requires: [{ type: 'requirement', key: 'product.inventory', label: '商品系統的「庫存管理」' }],
        },
        { key: 'cart.shippingEstimate', label: '運費預估', type: 'check', pricing: EVAL('運費計算規則差異大，需確認規則後評估') },
        { key: 'cart.freeShippingHint', label: '免運門檻提示', type: 'check', pricing: NONE },
        { key: 'cart.other', label: '其他購物車需求', type: 'text', placeholder: '例如：加購品、滿額贈…' },
      ],
    },

    // ─────────────────────────── Checkout ───────────────────────────
    {
      key: 'checkout', label: 'Checkout 結帳',
      baseIncludes: ['結帳頁', '商品／數量／金額確認', '訂購人資料', '收件人資料', '訂購人／收件人相同快速帶入', '送出訂單', '訂單成立結果頁'],
      notes: ['付款與配送選項是記錄你的需求。信用卡、第三方物流等實際串接屬於第三方服務，不等於網站本體自動包含全部服務責任。'],
      items: [
        {
          key: 'checkout.identity', label: '結帳身分', type: 'single',
          options: [
            { value: 'member_only', label: '必須登入會員', pricing: BASE },
            { value: 'guest', label: '可訪客結帳', pricing: EVAL('訪客結帳不在基礎電商模組定義內（基礎方案為會員結帳）') },
            { value: 'both', label: '兩者皆可', pricing: EVAL('會員與訪客結帳並存，需確認訂單與會員資料處理方式') },
          ],
        },
        {
          key: 'checkout.extraFields', label: '結帳時需要收集的其他資料（可複選）', type: 'multi',
          options: [
            {
              value: 'invoice_info', label: '發票資訊（公司抬頭／統一編號等欄位）', pricing: BASE,
              hint: '僅為收集發票資料欄位，不等於電子發票平台串接。',
              children: [
                {
                  key: 'checkout.einvoice', label: '需要串接電子發票平台（自動開立發票）', type: 'check',
                  pricing: FEAT('integrations', 'invoice'), thirdParty: ['einvoice_provider'],
                },
              ],
            },
            { value: 'order_note', label: '訂單備註', pricing: BASE },
          ],
        },
        {
          key: 'checkout.payment', label: '付款方式（可複選）', type: 'multi',
          options: [
            {
              value: 'credit_card', label: '信用卡', pricing: FEAT('integrations', 'payment-3rd'),
              thirdParty: ['payment_gateway'],
            },
            {
              value: 'atm', label: 'ATM／銀行轉帳',
              children: [
                {
                  key: 'checkout.payment.atmType', label: 'ATM／轉帳的處理方式', type: 'single',
                  options: [
                    { value: 'manual', label: '一般銀行轉帳，由店家人工對帳', pricing: BASE },
                    {
                      value: 'virtual_account', label: '第三方金流虛擬帳號（自動對帳）',
                      pricing: FEAT('integrations', 'payment-3rd'), thirdParty: ['payment_gateway'],
                    },
                    { value: 'unsure', label: '尚未確定', pricing: NONE },
                  ],
                },
              ],
            },
            { value: 'cod', label: '貨到付款', pricing: NONE },
            { value: 'other', label: '其他', other: true },
          ],
        },
        {
          key: 'checkout.shipping', label: '配送方式（可複選）', type: 'multi',
          options: [
            { value: 'home', label: '宅配', pricing: BASE },
            { value: 'cvs', label: '超商取貨', pricing: NONE },
            { value: 'pickup', label: '門市／現場取貨', pricing: NONE },
            { value: 'digital', label: '數位商品／不需配送', pricing: EVAL('數位商品交付方式不在基礎電商模組定義內') },
            { value: 'other', label: '其他', other: true },
          ],
        },
        {
          key: 'checkout.logistics', label: '物流處理', type: 'single',
          options: [
            { value: 'self', label: '店家自行處理出貨', pricing: BASE },
            {
              value: 'third_party', label: '希望串接第三方物流（建立託運資料／超商取貨串接）',
              pricing: FEAT('integrations', 'logistics'), thirdParty: ['logistics_provider'],
            },
          ],
        },
        {
          key: 'checkout.refund', label: '退款處理', type: 'single',
          options: [
            { value: 'manual', label: '由店家／金流平台人工處理', pricing: BASE },
            { value: 'auto', label: '希望網站提供退款自動化', pricing: EVAL('退款自動化不屬一般基本功能') },
            { value: 'undecided', label: '尚未確定', pricing: NONE },
          ],
        },
        { key: 'checkout.other', label: '其他結帳需求', type: 'text', placeholder: '例如：指定到貨日、禮物包裝…' },
      ],
    },

    // ─────────────────────────── 會員系統 ───────────────────────────
    {
      key: 'member', label: '會員系統',
      baseIncludes: ['Email 註冊', '登入／登出', 'Email 驗證', '忘記密碼／重設密碼', '基本會員資料', '修改基本會員資料', '登入狀態管理', '查看歷史訂單（含訂單詳細內容）'],
      notes: [],
      items: [
        {
          key: 'member.wishlist', stateKey: 'product.wishlist', label: '收藏商品', type: 'check',
          pricing: FEAT('member', 'wishlist'), requires: [REQ_MEMBER],
          hint: '與商品系統的「收藏商品」是同一項需求。',
        },
        {
          key: 'member.savedAddresses', label: '儲存常用收件地址', type: 'check',
          pricing: EVAL('多筆常用地址（地址簿）屬進階會員欄位，需另行評估'),
        },
        {
          key: 'member.level', label: '會員等級', type: 'check', pricing: FEAT('member', 'member-adv'),
          children: [
            {
              key: 'member.level.rule', label: '等級如何決定？（可複選）', type: 'multi',
              options: [
                { value: 'manual', label: '後台人工設定' },
                { value: 'spend', label: '累積消費金額自動升級' },
                { value: 'order_count', label: '訂單次數' },
                { value: 'other', label: '其他規則', other: true },
              ],
            },
            {
              key: 'member.level.benefits', label: '等級權益（可複選）', type: 'multi',
              options: [
                { value: 'discount', label: '折扣' },
                {
                  value: 'coupon', label: '專屬優惠券',
                  requires: [{ type: 'feature', group: 'ecom', id: 'coupon', label: '「其他功能／加購」中的「優惠券 / 折扣碼」' }],
                },
                { value: 'exclusive', label: '專屬商品／內容' },
                { value: 'other', label: '其他權益', other: true },
              ],
            },
          ],
        },
        {
          key: 'member.points', label: '會員點數', type: 'check', pricing: FEAT('member', 'member-adv'),
          children: [
            {
              key: 'member.points.earn', label: '點數取得方式（可複選）', type: 'multi',
              options: [
                { value: 'purchase', label: '消費累積' },
                { value: 'event', label: '註冊／活動贈點' },
                { value: 'other', label: '其他', other: true },
              ],
            },
            {
              key: 'member.points.use', label: '點數使用方式（可複選）', type: 'multi',
              options: [
                { value: 'redeem_discount', label: '折抵消費金額' },
                { value: 'redeem_item', label: '兌換商品' },
                { value: 'other', label: '其他', other: true },
              ],
            },
            {
              key: 'member.points.expiry', label: '點數是否有期限？', type: 'single',
              options: [
                { value: 'none', label: '無期限' },
                { value: 'has', label: '有期限' },
                { value: 'undecided', label: '尚未確定' },
              ],
            },
            {
              key: 'member.points.special', label: '有特殊點數規則（例如加倍、分級倍率、指定商品）', type: 'check',
              pricing: EVAL('特殊會員點數規則需人工確認'),
            },
          ],
        },
        {
          key: 'member.oauthGoogle', label: 'Google 登入', type: 'check',
          pricing: FEAT('member', 'oauth-google'), thirdParty: ['firebase'],
        },
        {
          key: 'member.oauthLine', label: 'LINE 登入', type: 'check',
          pricing: FEAT('member', 'oauth-line'), thirdParty: ['line_login'],
        },
        {
          key: 'member.oauthApple', label: 'Apple 登入', type: 'check',
          pricing: FEAT('member', 'oauth-apple'), thirdParty: ['apple_login'],
        },
        {
          key: 'member.extraFields', label: '其他需要的會員資料（可複選）', type: 'multi',
          options: [
            { value: 'phone', label: '電話', pricing: BASE },
            { value: 'address', label: '地址', pricing: BASE },
            { value: 'birthday', label: '生日', pricing: NONE },
            { value: 'company', label: '公司／統編', pricing: EVAL('公司資料屬進階會員欄位，需另行評估') },
            { value: 'other', label: '其他', other: true },
          ],
        },
        { key: 'member.other', label: '其他會員需求', type: 'text', placeholder: '例如：會員專屬頁面、黑名單…' },
      ],
    },

    // ─────────────────────────── 訂單系統 ───────────────────────────
    {
      key: 'order', label: '訂單系統',
      baseIncludes: ['建立訂單', '訂單編號', '保存商品／數量／價格', '訂購／收件資料', '訂單金額', '後台查看訂單', '基本訂單狀態管理', '訂單成立結果', '網站記錄訂單付款狀態'],
      notes: [
        '使用第三方金流時，網站依串接範圍接收付款結果。',
        '取消訂單不等於自動退款。自動退款／取消交易／特殊付款異常處理不屬一般基本功能，需另行評估。',
      ],
      items: [
        {
          key: 'order.flow', label: '訂單流程', type: 'single',
          options: [
            { value: 'standard', label: '一般流程（成立 → 付款 → 出貨 → 完成）', pricing: BASE },
            { value: 'custom', label: '需要自訂流程', pricing: EVAL('自訂訂單流程需人工確認'), other: true, otherPlaceholder: '請簡述你的訂單流程' },
          ],
        },
        { key: 'order.manualPayStatus', label: '後台需要可人工修改付款狀態', type: 'check', pricing: BASE },
        {
          key: 'order.shippingStatus', label: '配送狀態更新方式', type: 'single',
          options: [
            { value: 'manual', label: '店家後台人工更新', pricing: BASE },
            {
              value: 'auto_sync', label: '第三方物流自動同步',
              pricing: EVAL('第三方物流狀態自動同步需人工確認'), thirdParty: ['logistics_provider'],
              requires: [{ type: 'answer', key: 'checkout.logistics', value: 'third_party', label: 'Checkout 的「希望串接第三方物流」' }],
            },
          ],
        },
        {
          key: 'order.cancel', label: '顧客取消訂單', type: 'single',
          options: [
            { value: 'contact', label: '聯絡店家處理', pricing: BASE },
            { value: 'self', label: '特定狀態下顧客可自行取消', pricing: EVAL('顧客自行取消訂單不在基礎電商模組定義內') },
          ],
        },
        {
          key: 'order.notifications', label: '訂單通知（可複選）', type: 'multi',
          hint: 'Email 自動通知不含於基礎方案，選擇任一項即加入「Email 自動通知」（多選仍只計一次）。',
          options: [
            { value: 'order_confirm', label: '下單確認 Email', pricing: FEAT('integrations', 'email-auto'), thirdParty: ['email_service'] },
            { value: 'merchant_new_order', label: '店家新訂單通知', pricing: FEAT('integrations', 'email-auto'), thirdParty: ['email_service'] },
            { value: 'status_update', label: '訂單狀態更新通知', pricing: FEAT('integrations', 'email-auto'), thirdParty: ['email_service'] },
            { value: 'shipped', label: '出貨通知', pricing: FEAT('integrations', 'email-auto'), thirdParty: ['email_service'] },
            { value: 'other', label: '其他', other: true },
          ],
        },
        { key: 'order.other', label: '其他訂單需求', type: 'text', placeholder: '例如：訂單匯出格式、部分出貨…' },
      ],
    },

    // ─────────────────────────── 後台管理 ───────────────────────────
    {
      key: 'admin', label: '後台管理',
      baseIncludes: ['後台登入', '基本商品管理', '基本訂單管理'],
      notes: ['已選網站功能所需要的基本管理能力隨該功能包含，不重複計價。'],
      items: [
        {
          key: 'admin.dashboard', label: 'Dashboard（營運摘要）', type: 'check', pricing: FEAT('cms', 'dashboard'),
          children: [
            {
              key: 'admin.dashboard.content', label: '希望摘要哪些內容？（可複選）', type: 'multi',
              options: [
                { value: 'orders', label: '訂單' },
                { value: 'revenue', label: '營收' },
                { value: 'products', label: '商品／庫存' },
                { value: 'members', label: '會員' },
                { value: 'other', label: '其他', other: true },
              ],
            },
          ],
        },
        { key: 'admin.memberMgmt', label: '會員管理', type: 'check', pricing: FEAT('cms', 'member-mgmt') },
        { key: 'admin.export', label: '資料匯出', type: 'check', pricing: EVAL('資料匯出不在既有計價項目內，需確認匯出範圍') },
        { key: 'admin.batch', label: '批次操作', type: 'check', pricing: EVAL('批次操作不在既有計價項目內，需確認操作範圍') },
        { key: 'admin.reports', label: '報表／統計', type: 'check', pricing: EVAL('報表／統計不在既有計價項目內（與 Dashboard 範圍需一併確認）') },
        {
          key: 'admin.users', label: '後台使用者', type: 'single',
          options: [
            { value: 'single', label: '單一管理者', pricing: BASE },
            { value: 'multi_same', label: '多位管理者，權限相同', pricing: BASE },
            {
              value: 'multi_diff', label: '多位管理者，需要不同權限',
              children: [
                {
                  key: 'admin.users.permLevel', label: '權限複雜度', type: 'single',
                  options: [
                    { value: 'basic_roles', label: '兩三種固定角色（例如管理員／編輯者）', pricing: FEAT('cms', 'permission') },
                    {
                      value: 'rbac', label: '需依部門／資源／動作分別授權的權限矩陣',
                      pricing: { mode: 'evaluate', reason: '複雜權限矩陣（RBAC）需人工評估', relatedFeature: { group: 'evaluate', id: 'permission-adv' } },
                    },
                    { value: 'unsure', label: '尚未確定', pricing: EVAL('後台權限分級方式尚未確定') },
                  ],
                },
              ],
            },
          ],
        },
        { key: 'admin.other', label: '其他後台需求', type: 'text', placeholder: '例如：操作紀錄、通知中心…' },
      ],
    },
  ];

  // ══════════════════════════════════════════════════════════════════════
  //  純函式
  // ══════════════════════════════════════════════════════════════════════
  function stateKeyOf(node) { return node.stateKey || node.key; }
  function otherKeyOf(nodeKey, optValue) { return nodeKey + '__other__' + optValue; }

  // 檢查 dependency。ctx.hasFeature(group,id)：該 FEATURES 項目是否已在方案內或由客戶手動選擇。
  function checkRequires(requires, answers, ctx) {
    var list = [];
    var ok = true;
    (requires || []).forEach(function (r) {
      var satisfied = false;
      if (r.type === 'feature') satisfied = !!(ctx && ctx.hasFeature && ctx.hasFeature(r.group, r.id));
      else if (r.type === 'requirement') satisfied = !!answers[r.key];
      else if (r.type === 'answer') satisfied = answers[r.key] === r.value;
      if (!satisfied) ok = false;
      list.push({ type: r.type, label: r.label, satisfied: satisfied, group: r.group || null, id: r.id || null, key: r.key || null });
    });
    return { ok: ok, list: list };
  }

  function depHint(dep) {
    var missing = dep.list.filter(function (d) { return !d.satisfied; }).map(function (d) { return d.label; });
    return missing.length ? '此功能需要先選擇：' + missing.join('、') : '';
  }

  function resolvePricing(node, answers) {
    if (typeof node.pricingRule === 'function') {
      return node.pricingRule(function (k) { return answers[k]; }) || NONE;
    }
    return node.pricing || null;
  }

  // 走訪整棵需求樹，回傳：派生 pricing key、evaluate 項目、第三方責任、dependency 狀態、Snapshot 用的節點資料
  function evaluate(answers, ctx) {
    answers = answers || {};
    var derivedMap = {};     // 'group:id' → { group, id, from:[{key,label}] }
    var evaluateItems = [];
    var thirdPartyMap = {};  // service → { ..., from:[label] }
    var dependencies = [];
    var freeTexts = [];
    var selectedCountByCat = {};
    var catOut = [];

    function addEffects(pricing, thirdParty, key, label, cat) {
      if (pricing && pricing.mode === 'feature') {
        var k = pricing.group + ':' + pricing.id;
        if (!derivedMap[k]) derivedMap[k] = { group: pricing.group, id: pricing.id, from: [] };
        derivedMap[k].from.push({ key: key, label: label });
      } else if (pricing && pricing.mode === 'evaluate') {
        evaluateItems.push({
          key: key, label: label, categoryKey: cat.key, categoryLabel: cat.label,
          reason: pricing.reason || '', relatedFeature: pricing.relatedFeature || null,
        });
      }
      (thirdParty || []).forEach(function (svc) {
        var def = THIRD_PARTY_SERVICES[svc];
        if (!def) return;
        if (!thirdPartyMap[svc]) {
          thirdPartyMap[svc] = {
            service: svc, label: def.label, responsibilityType: def.responsibilityType,
            responsibilityLabel: RESPONSIBILITY_LABELS[def.responsibilityType] || '',
            note: def.note || '', from: [],
          };
        }
        if (thirdPartyMap[svc].from.indexOf(label) === -1) thirdPartyMap[svc].from.push(label);
      });
    }

    function pricingOut(p) {
      if (!p) return null;
      var o = { mode: p.mode };
      if (p.mode === 'feature') { o.group = p.group; o.id = p.id; }
      if (p.mode === 'evaluate') { o.reason = p.reason || ''; if (p.relatedFeature) o.relatedFeature = p.relatedFeature; }
      return o;
    }
    function responsibilityOut(thirdParty) {
      var out = [{ type: 'website', label: RESPONSIBILITY_SHORT.website }];
      (thirdParty || []).forEach(function (svc) {
        var def = THIRD_PARTY_SERVICES[svc];
        if (def) out.push({ type: def.responsibilityType, label: RESPONSIBILITY_SHORT[def.responsibilityType], service: svc, serviceLabel: def.label });
      });
      return out;
    }

    function walk(nodes, cat) {
      var out = [];
      (nodes || []).forEach(function (node) {
        var sk = stateKeyOf(node);
        var dep = checkRequires(node.requires, answers, ctx);
        var item = { key: node.key, label: node.label, type: node.type };
        if (node.stateKey) item.sharedWith = node.stateKey;
        if (node.hint) item.hint = node.hint;
        if (node.requires) {
          item.dependency = { satisfied: dep.ok, requires: dep.list };
          dependencies.push({ key: node.key, label: node.label, satisfied: dep.ok, requires: dep.list });
        }

        if (node.type === 'check') {
          var sel = !!answers[sk] && dep.ok;
          item.selected = sel;
          var p = sel ? resolvePricing(node, answers) : (node.pricing || null);
          item.pricing = pricingOut(p);
          item.responsibility = responsibilityOut(node.thirdParty);
          if (sel) {
            selectedCountByCat[cat.key] = (selectedCountByCat[cat.key] || 0) + 1;
            addEffects(p, node.thirdParty, node.key, node.label, cat);
            item.children = walk(node.children, cat);
          } else {
            item.children = [];
          }
        } else if (node.type === 'single' || node.type === 'multi') {
          var raw = answers[sk];
          var chosen = node.type === 'single' ? (raw ? [raw] : []) : (Array.isArray(raw) ? raw : []);
          item.options = [];
          item.children = [];
          (node.options || []).forEach(function (opt) {
            var odep = checkRequires(opt.requires, answers, ctx);
            var osel = chosen.indexOf(opt.value) !== -1 && odep.ok && dep.ok;
            var o = { value: opt.value, label: opt.label, selected: osel };
            if (opt.hint) o.hint = opt.hint;
            if (opt.pricing) o.pricing = pricingOut(opt.pricing);
            if (opt.thirdParty) o.responsibility = responsibilityOut(opt.thirdParty);
            if (opt.requires) {
              o.dependency = { satisfied: odep.ok, requires: odep.list };
              dependencies.push({ key: node.key + ':' + opt.value, label: node.label + '：' + opt.label, satisfied: odep.ok, requires: odep.list });
            }
            if (osel) {
              var olabel = node.label.replace(/（可複選）/g, '') + '：' + opt.label;
              addEffects(opt.pricing, opt.thirdParty, node.key + ':' + opt.value, olabel, cat);
              if (opt.other) {
                var t = String(answers[otherKeyOf(node.key, opt.value)] || '').trim();
                if (t) { o.otherText = t; freeTexts.push({ key: node.key + ':' + opt.value, label: olabel, text: t, categoryKey: cat.key }); }
              }
              if (opt.children) item.children = item.children.concat(walk(opt.children, cat));
            }
            item.options.push(o);
          });
          item.answered = item.options.some(function (o) { return o.selected; });
          if (item.answered) selectedCountByCat[cat.key] = (selectedCountByCat[cat.key] || 0) + 1;
        } else if (node.type === 'text') {
          var txt = String(answers[sk] || '').trim();
          item.text = txt;
          if (txt) {
            freeTexts.push({ key: node.key, label: node.label, text: txt, categoryKey: cat.key });
            selectedCountByCat[cat.key] = (selectedCountByCat[cat.key] || 0) + 1;
          }
        }
        out.push(item);
      });
      return out;
    }

    CATEGORIES.forEach(function (cat) {
      catOut.push({
        key: cat.key, label: cat.label, status: 'included',
        baseIncludes: cat.baseIncludes.slice(), notes: (cat.notes || []).slice(),
        items: walk(cat.items, cat),
      });
    });

    var derived = Object.keys(derivedMap).map(function (k) { return derivedMap[k]; });
    var thirdParty = Object.keys(thirdPartyMap).map(function (k) { return thirdPartyMap[k]; });
    return {
      categories: catOut,
      derived: derived,
      derivedKeySet: derived.map(function (d) { return d.group + ':' + d.id; }),
      evaluateItems: evaluateItems,
      thirdParty: thirdParty,
      dependencies: dependencies,
      freeTexts: freeTexts,
      selectedCountByCat: selectedCountByCat,
    };
  }

  // 建立 requirementSnapshot（純資料，可直接寫入 Firestore；submittedAt 由呼叫端補上 serverTimestamp）
  // ctx.featureInfo(group,id) → { name, included }：只用來把「當時的功能名稱／是否方案內含」一併存進 Snapshot
  function buildSnapshot(answers, ctx) {
    var ev = evaluate(answers, ctx);
    var derivedPricingKeys = ev.derived.map(function (d) {
      var info = (ctx && ctx.featureInfo && ctx.featureInfo(d.group, d.id)) || {};
      return {
        group: d.group, id: d.id,
        featureName: info.name || '',
        includedInPlan: !!info.included,
        from: d.from,
      };
    });
    // 固定包含的平台服務責任（不論客戶回答，ecom 方案皆使用 Firebase 基礎架構）
    var thirdParty = ev.thirdParty.slice();
    if (!thirdParty.some(function (t) { return t.service === 'firebase'; })) {
      var fb = THIRD_PARTY_SERVICES.firebase;
      thirdParty.push({
        service: 'firebase', label: fb.label, responsibilityType: fb.responsibilityType,
        responsibilityLabel: RESPONSIBILITY_LABELS[fb.responsibilityType], note: fb.note, from: ['方案基礎架構'],
      });
    }
    var snap = {
      schemaVersion: SCHEMA_VERSION,
      definitionVersion: DEFINITION_VERSION,
      projectTypeKey: PROJECT_TYPE_KEY,
      submittedAtClient: new Date().toISOString(),
      categories: ev.categories,
      derivedPricingKeys: derivedPricingKeys,
      evaluateRequirements: ev.evaluateItems,
      thirdPartyResponsibilities: thirdParty,
      responsibilityLegend: RESPONSIBILITY_LABELS,
      dependencies: ev.dependencies,
      freeTexts: ev.freeTexts,
      requiresManualReview: ev.evaluateItems.length > 0,
    };
    // 去除 undefined（Firestore 不接受 undefined）
    return JSON.parse(JSON.stringify(snap));
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Snapshot 顯示（只依賴 Snapshot 自身資料；index 摘要／下載需求書／quote-detail 共用）
  //  opts.mode：'client'（預設）｜'admin'（額外顯示 pricing key、dependency、版本資訊）
  // ══════════════════════════════════════════════════════════════════════
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pricingTag(p, snap, admin) {
    if (!p) return '';
    var style = 'font-size:11px;padding:1px 7px;border-radius:10px;margin-left:6px;white-space:nowrap;';
    if (p.mode === 'base') return '<span style="' + style + 'background:#f0fdf4;color:#16a34a">方案內含</span>';
    if (p.mode === 'evaluate') return '<span style="' + style + 'background:#fffbeb;color:#d97706">需人工確認</span>';
    if (p.mode === 'feature') {
      var d = (snap.derivedPricingKeys || []).filter(function (x) { return x.group === p.group && x.id === p.id; })[0];
      var name = d && d.featureName ? d.featureName : '';
      var inc = d && d.includedInPlan;
      var text = inc ? '方案內含' : ('加購項目' + (name ? '：' + esc(name) : ''));
      if (admin) text += '（' + esc(p.group + '/' + p.id) + '）';
      return '<span style="' + style + (inc ? 'background:#f0fdf4;color:#16a34a' : 'background:#eff6ff;color:#2563eb') + '">' + text + '</span>';
    }
    return admin ? '<span style="' + style + 'background:#f0f1f4;color:#60636e">僅記錄</span>' : '';
  }

  // 把節點轉成「已選內容」的列（未選的 optional 不列在客戶摘要；admin 模式另列出未選項目）
  function collectLines(items, snap, admin, depth, lines, unselected) {
    (items || []).forEach(function (it) {
      var pad = 'padding-left:' + (depth * 16) + 'px;';
      if (it.type === 'check') {
        if (it.selected) {
          lines.push('<div style="' + pad + 'margin:3px 0">✓ ' + esc(it.label) + pricingTag(it.pricing, snap, admin) + '</div>');
          collectLines(it.children, snap, admin, depth + 1, lines, unselected);
        } else if (!it.sharedWith) {
          unselected.push(it.label + (it.dependency && !it.dependency.satisfied ? '（dependency 未滿足）' : ''));
        }
      } else if (it.type === 'single' || it.type === 'multi') {
        var sel = (it.options || []).filter(function (o) { return o.selected; });
        if (sel.length) {
          var parts = sel.map(function (o) {
            return esc(o.label) + (o.otherText ? '（' + esc(o.otherText) + '）' : '') + pricingTag(o.pricing, snap, admin);
          });
          lines.push('<div style="' + pad + 'margin:3px 0"><span style="color:#60636e">' + esc(it.label.replace(/（可複選）/g, '')) + '：</span>' + parts.join('、') + '</div>');
          collectLines(it.children, snap, admin, depth + 1, lines, unselected);
        } else {
          unselected.push(it.label.replace(/（可複選）/g, '') + '（未回答）');
        }
      } else if (it.type === 'text') {
        if (it.text) lines.push('<div style="' + pad + 'margin:3px 0"><span style="color:#60636e">' + esc(it.label) + '：</span>' + esc(it.text) + '</div>');
      }
    });
  }

  function renderSnapshotHtml(snap, opts) {
    opts = opts || {};
    var admin = opts.mode === 'admin';
    if (!snap || !Array.isArray(snap.categories)) return '';
    var titleStyle = 'font-size:11px;font-weight:700;letter-spacing:.06em;color:#9ca3af;margin:0 0 6px';
    var html = '';

    snap.categories.forEach(function (cat) {
      var lines = [], unselected = [];
      collectLines(cat.items, snap, admin, 0, lines, unselected);
      html += '<div style="border:1px solid #f0f1f4;border-radius:8px;padding:12px 14px;margin-bottom:10px">';
      html += '<div style="font-size:14px;font-weight:600;color:#0f1117;margin-bottom:6px">' + esc(cat.label) +
              '<span style="font-size:11px;font-weight:500;padding:1px 7px;border-radius:10px;margin-left:8px;background:#f0fdf4;color:#16a34a">方案已包含</span></div>';
      html += '<div style="font-size:12px;color:#60636e;line-height:1.6;margin-bottom:6px"><span style="color:#9ca3af">基本包含：</span>' +
              (cat.baseIncludes || []).map(esc).join('、') + '</div>';
      html += '<div style="font-size:13px;color:#0f1117;line-height:1.6">' +
              (lines.length ? lines.join('') : '<div style="color:#9ca3af;font-size:12px">無額外／特殊需求</div>') + '</div>';
      if (admin && unselected.length) {
        html += '<div style="font-size:11px;color:#b8bac4;line-height:1.6;margin-top:6px">客戶未選／未回答：' + unselected.map(esc).join('、') + '</div>';
      }
      html += '</div>';
    });

    var evals = snap.evaluateRequirements || [];
    if (evals.length) {
      html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:10px">';
      html += '<div style="' + titleStyle + ';color:#d97706">需人工確認的需求（' + evals.length + ' 項，未計入預估價格）</div>';
      html += evals.map(function (e) {
        return '<div style="font-size:13px;color:#92400e;line-height:1.6">◆ ' + esc(e.categoryLabel) + '｜' + esc(e.label) +
               (e.reason ? '<span style="font-size:11px;color:#b45309">　— ' + esc(e.reason) + '</span>' : '') + '</div>';
      }).join('');
      html += '</div>';
    }

    var texts = snap.freeTexts || [];
    if (texts.length) {
      html += '<div style="border:1px solid #f0f1f4;border-radius:8px;padding:12px 14px;margin-bottom:10px">';
      html += '<div style="' + titleStyle + '">客戶補充內容</div>';
      html += texts.map(function (t) {
        return '<div style="font-size:13px;color:#0f1117;line-height:1.6"><span style="color:#60636e">' + esc(t.label) + '：</span>' + esc(t.text) + '</div>';
      }).join('');
      html += '</div>';
    }

    var tps = snap.thirdPartyResponsibilities || [];
    if (tps.length) {
      var short = { client_account: '客戶自有帳號', developer_setup_handover: '開發方建立・交付時移交', website: '網站開發' };
      html += '<div style="border:1px solid #f0f1f4;border-radius:8px;padding:12px 14px;margin-bottom:10px">';
      html += '<div style="' + titleStyle + '">第三方服務／責任</div>';
      html += tps.map(function (t) {
        return '<div style="font-size:13px;color:#0f1117;line-height:1.6;margin-bottom:6px">' + esc(t.label) +
               '<span style="font-size:11px;padding:1px 7px;border-radius:10px;margin-left:6px;background:#f0f1f4;color:#60636e">' + esc(short[t.responsibilityType] || t.responsibilityType) + '</span>' +
               '<div style="font-size:12px;color:#60636e">' + esc(t.note) + '</div>' +
               ((t.from || []).length ? '<div style="font-size:11px;color:#9ca3af">相關需求：' + t.from.map(esc).join('、') + '</div>' : '') +
               '</div>';
      }).join('');
      html += '<div style="font-size:11px;color:#9ca3af;line-height:1.6">網站端的串接與設定屬於開發工作；第三方服務本身的帳號、資格與費用依上列責任歸屬。</div>';
      html += '</div>';
    }

    if (admin) {
      var keys = snap.derivedPricingKeys || [];
      html += '<div style="border:1px dashed #b8bac4;border-radius:8px;padding:12px 14px;margin-bottom:10px">';
      html += '<div style="' + titleStyle + '">需求帶入的既有計價項目（pricing key）</div>';
      html += keys.length ? keys.map(function (k) {
        return '<div style="font-size:12px;color:#0f1117;line-height:1.6">' + esc(k.featureName || '') + ' <span style="color:#9ca3af">' + esc(k.group + '/' + k.id) + '</span>' +
               (k.includedInPlan ? '　<span style="color:#16a34a">方案內含</span>' : '') +
               '<span style="color:#9ca3af">　← ' + (k.from || []).map(function (f) { return esc(f.label); }).join('、') + '</span></div>';
      }).join('') : '<div style="font-size:12px;color:#9ca3af">無</div>';
      var blocked = (snap.dependencies || []).filter(function (d) { return !d.satisfied; });
      if (blocked.length) {
        html += '<div style="' + titleStyle + ';margin-top:10px">送出當時未滿足 dependency 而停用的項目</div>';
        html += blocked.map(function (d) {
          return '<div style="font-size:12px;color:#60636e;line-height:1.6">' + esc(d.label) + '　需要：' +
                 (d.requires || []).filter(function (r) { return !r.satisfied; }).map(function (r) { return esc(r.label); }).join('、') + '</div>';
        }).join('');
      }
      html += '<div style="font-size:11px;color:#b8bac4;margin-top:8px">schema v' + esc(snap.schemaVersion) + '・definition ' + esc(snap.definitionVersion) +
              '・客戶端送出時間 ' + esc(snap.submittedAtClient || '—') + '</div>';
      html += '</div>';
    }
    return html;
  }

  // 純文字摘要（通知信用）
  function snapshotToText(snap) {
    if (!snap || !Array.isArray(snap.categories)) return '';
    var out = [];
    function lines(items, depth) {
      (items || []).forEach(function (it) {
        var pad = new Array(depth + 1).join('  ');
        if (it.type === 'check' && it.selected) { out.push(pad + '- ' + it.label); lines(it.children, depth + 1); }
        else if ((it.type === 'single' || it.type === 'multi')) {
          var sel = (it.options || []).filter(function (o) { return o.selected; });
          if (sel.length) {
            out.push(pad + '- ' + it.label.replace(/（可複選）/g, '') + '：' + sel.map(function (o) { return o.label + (o.otherText ? '（' + o.otherText + '）' : ''); }).join('、'));
            lines(it.children, depth + 1);
          }
        } else if (it.type === 'text' && it.text) out.push(pad + '- ' + it.label + '：' + it.text);
      });
    }
    snap.categories.forEach(function (cat) {
      var before = out.length;
      out.push('【' + cat.label + '】');
      lines(cat.items, 0);
      if (out.length === before + 1) out.push('- 無額外需求');
    });
    if ((snap.evaluateRequirements || []).length) {
      out.push('【需人工確認】');
      snap.evaluateRequirements.forEach(function (e) { out.push('- ' + e.categoryLabel + '｜' + e.label); });
    }
    return out.join('\n');
  }

  root.NicocoRequirements = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFINITION_VERSION: DEFINITION_VERSION,
    PROJECT_TYPE_KEY: PROJECT_TYPE_KEY,
    RESPONSIBILITY_LABELS: RESPONSIBILITY_LABELS,
    THIRD_PARTY_SERVICES: THIRD_PARTY_SERVICES,
    CATEGORIES: CATEGORIES,
    stateKeyOf: stateKeyOf,
    otherKeyOf: otherKeyOf,
    checkRequires: checkRequires,
    depHint: depHint,
    resolvePricing: resolvePricing,
    evaluate: evaluate,
    buildSnapshot: buildSnapshot,
    renderSnapshotHtml: renderSnapshotHtml,
    snapshotToText: snapshotToText,
  };
})(typeof window !== 'undefined' ? window : this);
