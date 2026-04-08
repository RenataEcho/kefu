import authMock from './auth'
import rolesMock from './roles'
import paymentsMock from './payments'
import usersMock from './users'
import groupAuditsMock from './groupAudits'
import entryAuditsMock from './entryAudits'
import dashboardMock from './dashboard'
import csAgentsMock from './csAgents'
import accountsMock from './accounts'
import auditLogsMock from './auditLogs'
import devMock from './dev'
import dataExportMock from './dataExport'
import notificationsMock from './notifications'
import schoolsMock from './schools'
import mentorTypesMock from './mentorTypes'
import mentorsMock from './mentors'
import larkFriendsMock from './larkFriends'
import migrationUsersMock from './migrationUsers'
import migrationReverifyMock from './migrationReverify'

export default [
  ...authMock,
  ...rolesMock,
  ...paymentsMock,
  ...usersMock,
  ...groupAuditsMock,
  ...entryAuditsMock,
  ...dashboardMock,
  ...csAgentsMock,
  ...accountsMock,
  ...auditLogsMock,
  ...dataExportMock,
  ...devMock,
  ...notificationsMock,
  ...schoolsMock,
  ...mentorTypesMock,
  ...mentorsMock,
  ...larkFriendsMock,
  ...migrationUsersMock,
  ...migrationReverifyMock,
]
