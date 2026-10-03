/* ==========================================================================
   مكتبة الباك — site-config.js
   feedbackEndpoint: رابط Google Apps Script Web App (انظر apps-script/Code.gs).
     اتركه فارغًا "" لوضع المعاينة المحلي (تُحفظ الآراء في متصفح الزائر فقط).
     يجب أن يبدأ بـ https://. إن استعملت خدمة غير Google Apps Script، أضف
     نطاقها إلى connect-src في وسم Content-Security-Policy داخل index.html
     وdev.html، وإلا سيحجب المتصفح الاتصال (وهذا مقصود).

   devPassHash: بصمة رمز دخول لوحة الإدارة. ولّد بصمة جديدة من
     dev.html ← الإعدادات ← تغيير رمز الدخول. هذا حاجز بسيط فقط وليس حماية.
   ========================================================================== */
window.SITE_CONFIG = {
  feedbackEndpoint: "https://script.google.com/macros/s/AKfycbzkt47L7BZW8z51x2H8jb-EGhxf15lEPf3l4QpbjcOdnIq8ppM-Rg9pqoScgb92zLuj/exec",
  devPassHash: "9009ec0ac8506d7abfc3f94a819aa5654e09bd2c574aa4ada3c8e8812aa61176"
};
