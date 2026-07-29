// Gộp 14 module thành một object phẳng — vue-i18n nhận namespace phẳng như
// trước khi tách, nên mọi $t('...') đang có chạy nguyên, không đổi tên key.
// Tách file để 15 story của đợt nâng cấp giao diện không cùng sửa một file.
import common from './common'
import auth from './auth'
import nav from './nav'
import tenants from './tenants'
import channels from './channels'
import messages from './messages'
import jobs from './jobs'
import jobDetail from './job-detail'
import dashboard from './dashboard'
import settings from './settings'
import users from './users'
import logs from './logs'
import mcp from './mcp'
import errors from './errors'
import format from './format'

export default {
  ...common, ...auth, ...nav, ...tenants, ...channels, ...messages,
  ...jobs, ...jobDetail, ...dashboard, ...settings, ...users, ...logs,
  ...mcp, ...errors, ...format,
}
