import * as fc from 'fast-check'

export const WEEK_DAYS = ['Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun']
export const MONTHS = ['Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec']
export const PRODUCT_NAMES = ['Matcha Latte',
  'Milk Tea',
  'Cheese Cocoa',
  'Walnut Brownie']
export const BROWSERS = ['Chrome',
  'Firefox',
  'Safari',
  'Edge',
  'Opera']
export const TRAFFIC_SOURCES = ['Search Engine',
  'Direct',
  'Email',
  'Union Ads',
  'Video Ads']
export const DEPARTMENTS = ['Engineering',
  'Sales',
  'Marketing',
  'Support',
  'Finance',
  'Legal',
  'Operations',
  'HR',
  'Design',
  'IT']
export const FANTASY_CHARACTER_NAMES = ['Conan',
  'Gandalf',
  'Locke',
  'Elowen',
  'Draven',
  'Tamsin']
export const QUARTERS = ['Q1',
  'Q2',
  'Q3',
  'Q4']
export const REGIONS = ['North',
  'South',
  'East',
  'West']
export const CONTINENTS = ['Africa',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America']
export const KPI_METRICS = ['Revenue Growth',
  'Customer Satisfaction',
  'Uptime',
  'Conversion Rate',
  'Net Promoter Score',
  'Customer Retention',
  'Employee Engagement',
  'Response Time',
  'Order Fulfillment',
  'Quality Score']
export const GANTT_PROJECTS = ['Website Redesign',
  'Mobile App Launch',
  'Data Migration',
  'Marketing Campaign']
export const CHICAGO_EVENT_TYPES = ['Concert',
  'Festival',
  'Sports',
  'Tour',
  'Exhibition']
export const NEWS_TOPICS = ['Politics',
  'Technology',
  'Entertainment',
  'Sports',
  'Health']
export const KEYWORDS = ['Markdown',
  'Backlinks',
  'Graph View',
  'Plugins',
  'Templates',
  'Canvas',
  'Frontmatter',
  'Daily Notes',
  'Embeds',
  'Callouts',
  'Properties',
  'Dataview',
  'Excalidraw',
  'Kanban',
  'Outline',
  'Workspace',
  'Hotkeys',
  'Sidebar',
  'Command Palette',
  'Local Graph',
  'Vault',
  'Sync',
  'Themes',
  'Search',
  'Bases',
  'Tags',
  'Aliases',
  'Footnotes',
  'Publish',
  'Mobile']
export const PROJECT_TASK_NAMES = ['Kickoff Meeting',
  'Requirements Gathering',
  'Stakeholder Interviews',
  'Architecture Planning',
  'Design Review',
  'Wireframing',
  'Prototype Build',
  'Development Sprint 1',
  'Development Sprint 2',
  'Backend Integration',
  'API Testing',
  'QA Testing',
  'User Acceptance Testing',
  'Performance Tuning',
  'Security Audit',
  'Documentation',
  'Beta Release',
  'Production Deployment',
  'Post-Launch Review']

/**
 * Arbitrary that selects a random subset of a theme array, preserving order.
 */
export function themeSubset(theme: string[], minLength = 3) {
  return fc.subarray(
    theme,
    { minLength,
      maxLength: theme.length },
  )
}

/**
 * Arbitrary that selects a single item from a theme.
 */
export function themeItem(theme: string[]) {
  return fc.constantFrom(...theme)
}
