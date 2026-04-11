import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "سياسة الخصوصية",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 md:p-12">
        <div className="text-center mb-10">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mb-4 mx-auto" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            سياسة الخصوصية
          </h1>
        </div>

        <div className="prose prose-slate max-w-none leading-relaxed text-slate-700 text-[15px]">
          <p className="mb-8">
            نحن في هذا الموقع نلتزم بحماية خصوصية المستخدمين وضمان سرية معلوماتهم الشخصية، ونتخذ جميع الإجراءات اللازمة للحفاظ على أمن البيانات. باستخدامك لهذا الموقع أو تسجيلك فيه، فإنك توافق على جميع البنود الموضحة في سياسة الخصوصية هذه.
          </p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. جمع المعلومات</h2>
            <p>
              نقوم بجمع المعلومات التي يقدمها المستخدم بشكل مباشر عند التسجيل أو استخدام الخدمات داخل الموقع، وقد تشمل: الاسم الكامل، رقم الهاتف، البريد الإلكتروني، كلمة المرور، معلومات الحساب، بيانات الدفع أو السحب، عنوان IP، معلومات الجهاز والمتصفح. كما نجمع معلومات تلقائية مثل وقت تسجيل الدخول وسجل النشاط.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. استخدام المعلومات</h2>
            <p>
              يتم استخدام المعلومات للأغراض التالية: تقديم وتشغيل الخدمات، إدارة الحساب، تنفيذ السحب والإيداع، التواصل، إرسال التحديثات، تحسين الجودة، تحليل الأداء، تعزيز الأمان، والامتثال للقوانين.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. حماية المعلومات</h2>
            <p>
              نلتزم باستخدام أنظمة حماية متقدمة، تشفير البيانات الحساسة، تقييد الوصول، وتحديث الأنظمة. ورغم ذلك، لا يمكن ضمان الحماية بنسبة 100% من الهجمات الإلكترونية.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. مشاركة المعلومات</h2>
            <p>
              نحن لا نقوم ببيع أو تأجير معلومات المستخدمين لطرف ثالث، إلا للامتثال للقوانين، حماية الحقوق، منع الاحتيال، أو تقديم الخدمات عبر مزودين معتمدين.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. ملفات تعريف الارتباط (Cookies)</h2>
            <p>
              قد يستخدم الموقع ملفات تعريف الارتباط لتحسين التجربة وتحليل الاستخدام. يمكن للمستخدم تعطيلها من المتصفح، لكن قد يؤثر ذلك على وظائف الموقع.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. تخزين البيانات</h2>
            <p>
              نحتفظ ببيانات المستخدم طالما كان الحساب نشاطاً. وقد نحتفظ بها لفترة إضافية لأغراض قانونية وأمنية.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. حقوق المستخدم</h2>
            <p>
              يحق للمستخدم طلب الاطلاع، التعديل، الحذف، أو إيقاف استخدام بياناته وفقاً للأنظمة. وقد يتطلب ذلك التحقق من الهوية.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. حماية حساب المستخدم</h2>
            <p>
              المستخدم مسؤول عن سرية كلمة المرور وعدم مشاركتها. ولا يتحمل الموقع مسؤولية الخسائر الناتجة عن إهمال المستخدم.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. خصوصية الأطفال</h2>
            <p>
              هذا الموقع غير مخصص لمن تقل أعمارهم عن 15 سنة. ويحق للإدارة إيقاف أي حساب دون السن القانوني.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. نقل البيانات</h2>
            <p>
              قد يتم تخزين أو معالجة البيانات خارج دولة المستخدم لتشغيل الخدمات، وباستخدام الموقع توافق على ذلك.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. التعديلات على سياسة الخصوصية</h2>
            <p>
              يحق للإدارة تحديث السياسة دون إشعار مسبق. ويُعد استمرار الاستخدام موافقة على التحديثات.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. الموافقة على سياسة الخصوصية</h2>
            <p>
              باستخدامك للموقع تقر بأنك قرأت وفهمت ووافقت على استخدام بياناتك وفقاً لهذه السياسة.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">13. التواصل معنا</h2>
            <p>
              لأي استفسار، يمكن التواصل عبر البريد الإلكتروني أو خدمة الدعم الفني داخل الموقع.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
