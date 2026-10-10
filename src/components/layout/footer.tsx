import { getFooterSections, getSocialLinks, getFooterConfig } from '@/app/actions/footer'
import FooterClient from './footer-client'

import { auth } from '@/lib/auth'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'

export default async function Footer() {
  const sections = await getFooterSections()
  const socialLinks = await getSocialLinks()
  const config = await getFooterConfig()

  const session = await auth()
  const user = session?.user

  const canManageContent = hasPermission(user, PERMISSIONS.MANAGE_CONTENT)

  return <FooterClient
    initialSections={sections}
    initialSocialLinks={socialLinks}
    initialCopyright={config?.copyrightText}
    initialFooterSize={(config as any)?.footerSize}
    canManageContent={canManageContent}
  />
}
