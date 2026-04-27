export const dashboardStats = [
  { label: 'Content Ideas', value: '116', tone: 'neutral' },
  { label: 'Renders In Progress', value: '4', tone: 'accent' },
  { label: 'Ready To Publish', value: '9', tone: 'success' },
  { label: 'Manual Upload Queue', value: '3', tone: 'warning' },
]

export const contentIdeas = [
  {
    id: 116,
    topic: 'The Power of Embracing Failure as a Key to Entrepreneurial Success',
    script: 'Failure is not the end. Learn, adapt, and move again.',
    caption: 'Fall 7 times, stand up 8. #FailureToSuccess #StartupLife',
    keyword: 'Failed Business Meeting',
    shotstackStatus: 'done',
    tiktokStatus: 'draft',
    finalVideoStatus: 'ready',
    shotstackUrl: 'https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/z3vv0juoel/9beaa8b8-865a-4bac-b477-0f11c874fe63.mp4',
    uploadUrl: '',
  },
  {
    id: 114,
    topic: 'Overcoming the Fear of Saying No in Business',
    script: 'Set boundaries, protect focus, and say no with confidence.',
    caption: 'Learn to say no and grow with intention. #LeadershipTips',
    keyword: 'Business Negotiator',
    shotstackStatus: 'done',
    tiktokStatus: 'draft',
    finalVideoStatus: 'ready',
    shotstackUrl: 'https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/z3vv0juoel/a225be6f-e6e8-466c-ba99-785d8aa5fbaa.mp4',
    uploadUrl: '',
  },
  {
    id: 113,
    topic: 'Overcoming the Fear of Rejection in Sales',
    script: 'Rejection is normal. Focus on the next yes.',
    caption: 'Sales resilience is a mindset game. #SalesTips',
    keyword: 'Sales Call',
    shotstackStatus: 'rendering',
    tiktokStatus: 'draft',
    finalVideoStatus: 'processing',
    shotstackUrl: '',
    uploadUrl: '',
  },
]

export const statusGroups = [
  { label: 'Queued', value: 2 },
  { label: 'Rendering', value: 1 },
  { label: 'Ready', value: 9 },
  { label: 'Published', value: 5 },
]

export const tiktokAccounts = [
  {
    id: 1,
    nickname: 'serietiktok07',
    openId: '-000MiGDsVAboLay49xf6jAABXmapm58k16u',
    scope: 'user.info.basic,video.publish',
    environment: 'sandbox',
    status: 'connected',
  },
]

export const manualActions = [
  {
    id: 114,
    topic: 'Overcoming the Fear of Saying No in Business',
    shotstackUrl: 'https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/z3vv0juoel/a225be6f-e6e8-466c-ba99-785d8aa5fbaa.mp4',
    uploadUrl: 'Pending init publish',
    uploadStatus: 'ready_for_init',
    publishStatus: 'draft',
  },
  {
    id: 116,
    topic: 'The Power of Embracing Failure as a Key to Entrepreneurial Success',
    shotstackUrl: 'https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/z3vv0juoel/9beaa8b8-865a-4bac-b477-0f11c874fe63.mp4',
    uploadUrl: 'Stored after init publish',
    uploadStatus: 'init_done',
    publishStatus: 'uploading',
  },
]
