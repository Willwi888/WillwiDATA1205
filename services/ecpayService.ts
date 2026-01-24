
// ECPay Service for Client-Side Integration
// 注意：此為前端實作範例。正式環境建議由後端生成 CheckMacValue 以保護金鑰。

// 測試環境設定 (Stage)
// 若要切換至正式環境，請修改為正式的 MerchantID/HashKey/HashIV，並將 API URL 改為 https://payment.ecpay.com.tw/Cashier/AioCheckOutV5
const MERCHANT_ID = '2000132'; 
const HASH_KEY = 'I2ayC4ae2cQCwtyHxtR0tAE1mm0lbbk5';
const HASH_IV = 'PhEa065tXcIJ18EC';
const ECPAY_API_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOutV5'; 

interface ECPayParams {
  MerchantID: string;
  MerchantTradeNo: string;
  MerchantTradeDate: string;
  PaymentType: string;
  TotalAmount: number;
  TradeDesc: string;
  ItemName: string;
  ReturnURL: string;
  ChoosePayment: string;
  EncryptType: number;
  ClientBackURL?: string;
  OrderResultURL?: string;
  NeedExtraPaidInfo?: string;
  [key: string]: any;
}

// Helper: ECPay specific URL Encoding
const ecpayEncode = (text: string): string => {
  let encoded = encodeURIComponent(text).replace(/%20/g, '+');
  return encoded;
};

// Helper: Generate CheckMacValue (SHA256)
const generateCheckMacValue = async (params: ECPayParams): Promise<string> => {
  // 1. Sort parameters alphabetically
  const keys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  
  // 2. Concatenate parameters
  let rawString = `HashKey=${HASH_KEY}`;
  keys.forEach(key => {
    rawString += `&${key}=${params[key]}`;
  });
  rawString += `&HashIV=${HASH_IV}`;

  // 3. URL Encode & Replace specific characters (DotNet compatible)
  let encodedString = encodeURIComponent(rawString).toLowerCase();
  
  encodedString = encodedString
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  // 4. SHA256 Hash
  const msgBuffer = new TextEncoder().encode(encodedString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 5. To Uppercase
  return hashHex.toUpperCase();
};

export const submitECPayForm = async (
  amount: number, 
  itemName: string, 
  tradeDesc: string,
  extraData?: any
) => {
  const tradeNo = 'Willwi' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 999);
  const date = new Date().toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).replace(/\//g, '/');

  // Construct Return URL (Client Back)
  // We attach a query param ?payment=success to detect return
  const currentUrl = window.location.href.split('#')[0];
  // Assuming Hash Router is used: base/#/interactive
  const clientBackUrl = `${currentUrl}#/interactive?payment=success&ts=${Date.now()}`;

  const params: ECPayParams = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: date,
    PaymentType: 'aio',
    TotalAmount: amount,
    TradeDesc: ecpayEncode(tradeDesc), 
    ItemName: itemName.substring(0, 50), // Max 50 chars limit
    ReturnURL: clientBackUrl, // Server Callback (Required field, using client url as placeholder for serverless)
    ClientBackURL: clientBackUrl, // Button "Back to Store"
    ChoosePayment: 'ALL', // Allow Credit, ATM, CVS
    EncryptType: 1,
    NeedExtraPaidInfo: 'Y',
  };

  try {
    const checkMacValue = await generateCheckMacValue(params);
    const finalParams = { ...params, CheckMacValue: checkMacValue };

    // Create and submit form dynamically
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = ECPAY_API_URL;
    form.style.display = 'none';

    Object.keys(finalParams).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = finalParams[key].toString();
      form.appendChild(input);
    });

    document.body.appendChild(form);
    
    // Store transaction intent in localStorage to verify upon return
    if (extraData) {
        localStorage.setItem('willwi_pending_tx', JSON.stringify({
            tradeNo,
            ...extraData
        }));
    }

    form.submit();
  } catch (error) {
    console.error("ECPay Generation Error:", error);
    alert("金流加密運算失敗，請稍後再試。");
  }
};
