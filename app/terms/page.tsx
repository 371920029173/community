import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { FileText, AlertCircle, Scale, Shield } from 'lucide-react'

export const metadata = {
  title: '服务条款 - 文件分享平台',
  description: '文件分享平台服务条款和使用协议'
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">服务条款</h1>
            </div>
            <p className="text-gray-600">最后更新：{new Date().toLocaleDateString('zh-CN')}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 接受条款</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                欢迎使用文件分享平台（以下简称"本平台"）。使用我们的服务即表示您同意遵守本服务条款。
                如果您不同意这些条款，请勿使用我们的服务。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 服务描述</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本平台提供文件上传、存储、分享和管理服务。我们保留随时修改、暂停或终止服务的权利。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                3. 用户行为规范
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                使用本服务时，您同意：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>不得上传非法内容</strong>：包括但不限于色情、暴力、侵权、恶意软件等</li>
                <li><strong>不得侵犯他人权益</strong>：不得上传侵犯版权、商标权、隐私权的内容</li>
                <li><strong>不得滥用服务</strong>：不得进行垃圾邮件、恶意攻击、滥用系统资源等</li>
                <li><strong>遵守法律法规</strong>：遵守所在地区和目标地区的法律法规</li>
                <li><strong>保护账户安全</strong>：不得与他人分享账户信息，及时报告安全问题</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 账户责任</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                您对您的账户和账户下的所有活动负责。您必须：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>提供真实、准确的注册信息</li>
                <li>保护账户信息的安全性</li>
                <li>及时通知我们任何未授权的账户使用</li>
                <li>年满 18 岁（如果是个人账户）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 知识产权</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                您上传的文件内容，您保留所有权。通过上传，您授予我们：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>存储、传输和展示您的文件的许可</li>
                <li>提供服务所需的技术处理权限</li>
                <li>在您分享的文件范围内，允许其他用户访问（如果文件设置为公开）</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                本平台的所有内容、设计、代码和技术均受知识产权保护，未经许可不得复制或使用。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 内容审核与删除</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们保留审核、删除或拒绝任何违反本条款的内容的权利，包括但不限于：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>非法、有害、威胁性、辱骂性或侵权内容</li>
                <li>垃圾邮件、广告或未经授权的商业内容</li>
                <li>恶意软件、病毒或其他有害代码</li>
                <li>违反第三方权利的内容</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 服务可用性</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们努力提供服务，但不保证：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>服务永久可用或不中断</li>
                <li>服务完全无错误或故障</li>
                <li>满足所有用户需求</li>
                <li>文件永久存储（我们保留在合理通知后删除长期未访问的文件的权利）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                8. 免责声明
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                在法律允许的最大范围内：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>服务按"现状"提供，不提供任何明示或暗示的保证</li>
                <li>我们不保证服务的准确性、完整性或适用性</li>
                <li>我们对因使用或无法使用服务而造成的任何损失不承担责任</li>
                <li>用户对其上传的内容承担全部责任</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 服务终止</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们可能因以下原因终止或暂停您的账户：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>违反本服务条款</li>
                <li>长期不活动（通常为 6 个月以上）</li>
                <li>法律要求</li>
                <li>滥用或恶意行为</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                账户终止后，我们可能删除您的文件和账户信息（在法律允许的情况下）。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 条款变更</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们保留随时修改本服务条款的权利。重大变更将在网站上显著位置通知。
                继续使用服务即表示您接受更新后的条款。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 适用法律</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本服务条款受中华人民共和国法律管辖（如适用）。如有争议，应通过友好协商解决；
                协商不成的，可提交有管辖权的人民法院解决。
              </p>
            </section>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>重要提示</strong>：使用我们的服务即表示您同意本服务条款。
                如果您不同意，请停止使用我们的服务并删除您的账户。
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                <Shield className="w-5 h-5 inline mr-2" />
                查看隐私政策
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

