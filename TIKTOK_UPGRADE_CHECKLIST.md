# ✅ TikTok Page Upgrade - Detailed Checklist

**Start Date:** ___________  
**Target Completion:** ___________  
**Team:** Developer 1: ___________ | Developer 2: ___________

---

## 🔵 PHASE 1: Code Quality & TypeScript (Week 1)

### Task 1.1: Create TypeScript Type Definitions
**Estimated:** 4-6 hours | **Assigned to:** Dev A

**Subtasks:**
- [ ] Create `src/types/tiktok.ts`
  - [ ] `TikTokAccount` interface
  - [ ] `TikTokAccountStatus` enum
  - [ ] `TikTokAccountContextRequest` / `Response`
- [ ] Create `src/types/services.ts`
  - [ ] `ServiceProvider` type (union: N8N | GROQ | SHOTSTACK | PEXELS)
  - [ ] `ServiceConnection` interface
  - [ ] `ServiceConnectionForm` interface
  - [ ] Service provider configs
- [ ] Create `src/types/workflow.ts`
  - [ ] `ContentIdea` interface
  - [ ] `WorkflowRun` interface
  - [ ] `WorkflowStep` enum
  - [ ] `PipelineState` interface
  - [ ] `UploadResult` interface
- [ ] Create `src/types/errors.ts`
  - [ ] `AppError` interface
  - [ ] `ErrorSeverity` enum
  - [ ] `ErrorContext` interface
- [ ] Create `src/types/api.ts`
  - [ ] All API response types
  - [ ] All API request types

**Quality Checks:**
- [ ] `npx tsc --noEmit` - All types valid
- [ ] No `any` types (except explicitly allowed)
- [ ] All exports documented with JSDoc
- [ ] Exported from single `src/types/index.ts`

**Review Checklist:**
- [ ] Types match current API responses
- [ ] Type names follow convention (PascalCase for types, camelCase for utils)
- [ ] Proper use of unions vs interfaces
- [ ] Nullable/optional fields marked correctly

---

### Task 1.2: Create Custom Hooks
**Estimated:** 6-8 hours | **Assigned to:** Dev A

#### Hook 1: `useTikTokAccounts`
- [ ] File: `src/hooks/useTikTokAccounts.ts`
- [ ] Functions:
  - [ ] Fetch accounts list
  - [ ] Connect account (OAuth)
  - [ ] Disconnect account
  - [ ] Error handling + retry
- [ ] Return interface:
  ```typescript
  {
    accounts: TikTokAccount[];
    isLoading: boolean;
    isConnecting: boolean;
    isDisconnecting: boolean;
    error: Error | null;
    connect: () => Promise<void>;
    disconnect: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
  }
  ```
- [ ] Tests: `__tests__/hooks/useTikTokAccounts.test.ts`
  - [ ] Test fetch on mount
  - [ ] Test connect flow
  - [ ] Test disconnect flow
  - [ ] Test error handling

#### Hook 2: `useServiceConnections`
- [ ] File: `src/hooks/useServiceConnections.ts`
- [ ] Functions:
  - [ ] Fetch all connections
  - [ ] Group by provider
  - [ ] Save connection
  - [ ] Delete connection
  - [ ] Validate connection
  - [ ] Activate connection
- [ ] Tests: `__tests__/hooks/useServiceConnections.test.ts`

#### Hook 3: `useAccountsForm`
- [ ] File: `src/hooks/useAccountsForm.ts`
- [ ] Manages form state for service connections
- [ ] Validation on-the-fly
- [ ] Reset + clear functions
- [ ] Tests included

#### Hook 4: `useAccountsFeedback`
- [ ] File: `src/hooks/useAccountsFeedback.ts`
- [ ] Toast/feedback message management
- [ ] Auto-dismiss after 3-5 seconds
- [ ] Multiple messages queue
- [ ] Tests included

#### Hook 5: `useTikTokWorkflow`
- [ ] File: `src/hooks/useTikTokWorkflow.ts`
- [ ] Manage workflow state (which step, data, etc.)
- [ ] Step navigation (next, previous, jump)
- [ ] Workflow state persistence
- [ ] Tests included

**Quality Checks:**
- [ ] All hooks typed with TypeScript
- [ ] All hooks have error handling
- [ ] All hooks tested (80%+ coverage)
- [ ] No console.log left
- [ ] Proper hook cleanup (useEffect return)

---

### Task 1.3: Refactor TikTokAccountsPage Component
**Estimated:** 5-6 hours | **Assigned to:** Dev B

**Current File:** `src/pages/TikTokAccountsPage.jsx` (600 lines)

**Target Structure:**
```
TikTokAccountsPage.tsx (120 lines)
├── AccountsHeader.tsx (60 lines)
├── TikTokAccountCard.tsx (80 lines)
├── ServiceConnectionCard.tsx (120 lines)
├── ServiceConnectionModal.tsx (150 lines)
└── ServiceConnectionForm.tsx (100 lines)
```

**Step 1: Extract AccountsHeader**
- [ ] File: `src/components/AccountsHeader.tsx`
- [ ] Shows page title + description
- [ ] Responsive header layout
- [ ] Tests: `__tests__/components/AccountsHeader.test.tsx`

**Step 2: Extract TikTokAccountCard**
- [ ] File: `src/components/TikTokAccountCard.tsx`
- [ ] Show one TikTok account
- [ ] Disconnect button with loading state
- [ ] Status indicator
- [ ] Props typed with interface
- [ ] Tests included

**Step 3: Extract ServiceConnectionCard**
- [ ] File: `src/components/ServiceConnectionCard.tsx`
- [ ] Show one service (n8n, Groq, etc.)
- [ ] Connect / Edit / Validate / Disconnect buttons
- [ ] Status pills
- [ ] Props typed
- [ ] Tests included

**Step 4: Extract ServiceConnectionModal**
- [ ] File: `src/components/ServiceConnectionModal.tsx`
- [ ] Modal wrapper
- [ ] Header + close button
- [ ] Form inside
- [ ] Footer with cancel/save
- [ ] Tests included

**Step 5: Extract ServiceConnectionForm**
- [ ] File: `src/components/ServiceConnectionForm.tsx`
- [ ] Form fields (name, URL, identifier, secret)
- [ ] JSON metadata textarea
- [ ] Help text for each field
- [ ] Validation display
- [ ] Tests included

**Step 6: Refactor Main Page**
- [ ] Update `TikTokAccountsPage.tsx` to use hooks
- [ ] Remove all inline state management
- [ ] Use new components
- [ ] Use hooks for data fetching
- [ ] Error handling with feedback hook
- [ ] Tests included

**Quality Checks:**
- [ ] Component tree depth max 3 levels
- [ ] No component > 200 lines
- [ ] All props typed
- [ ] All components tested (80%+)
- [ ] No CSS in JS (use stylesheet)
- [ ] Accessibility ARIA labels added
- [ ] Mobile responsive

---

### Task 1.4: Refactor TikTokJourneyPage Component
**Estimated:** 8-10 hours | **Assigned to:** Dev B

**Current File:** `src/pages/TikTokJourneyPage.jsx` (1200 lines) ← HUGE!

**Target Structure:**
```
TikTokJourneyPage.tsx (150 lines) - Main layout
├── components/
│   ├── TikTokLibrary.tsx (200 lines) - List view
│   ├── TikTokWorkflow.tsx (150 lines) - Step view
│   └── WorkflowSteps/
│       ├── CreationStep.tsx (150 lines)
│       ├── ScriptStep.tsx (120 lines)
│       ├── RenderStep.tsx (120 lines)
│       ├── UploadStep.tsx (130 lines)
│       └── PublishStep.tsx (100 lines)
├── contexts/
│   └── TikTokWorkflowContext.tsx (80 lines)
└── hooks/
    ├── useTikTokWorkflow.ts (100 lines) - Already done in 1.2
    └── useWorkflowMonitor.ts (80 lines) - New
```

**Step 1: Create Workflow Context**
- [ ] File: `src/contexts/TikTokWorkflowContext.tsx`
- [ ] Define `WorkflowState` interface
- [ ] Context provider component
- [ ] `useTikTokWorkflow` hook to use context
- [ ] Initial state values
- [ ] Tests included

**Step 2: Extract CreationStep Component**
- [ ] File: `src/components/WorkflowSteps/CreationStep.tsx`
- [ ] Show category select + count input
- [ ] Generate button
- [ ] Show generated ideas list
- [ ] Select idea button
- [ ] Validate/next button
- [ ] Uses custom hook for step logic
- [ ] Tests included

**Step 3: Extract ScriptStep Component**
- [ ] File: `src/components/WorkflowSteps/ScriptStep.tsx`
- [ ] Show selected idea
- [ ] Display generated script
- [ ] Regenerate button
- [ ] Validate/next button
- [ ] Tests included

**Step 4: Extract RenderStep Component**
- [ ] File: `src/components/WorkflowSteps/RenderStep.tsx`
- [ ] Show video preview
- [ ] Retry button
- [ ] Validate/next button
- [ ] Tests included

**Step 5: Extract UploadStep Component**
- [ ] File: `src/components/WorkflowSteps/UploadStep.tsx`
- [ ] Prepare upload button
- [ ] Upload button
- [ ] Upload progress
- [ ] Validate/next button
- [ ] Tests included

**Step 6: Extract PublishStep Component**
- [ ] File: `src/components/WorkflowSteps/PublishStep.tsx`
- [ ] Publish button
- [ ] Publish status
- [ ] Done/finish button
- [ ] Tests included

**Step 7: Extract TikTokLibrary Component**
- [ ] File: `src/components/TikTokLibrary.tsx`
- [ ] List view rendering
- [ ] Toolbar (search, filter, sort)
- [ ] Card or table view toggle
- [ ] Grid of videos
- [ ] Tests included

**Step 8: Extract TikTokWorkflow Component**
- [ ] File: `src/components/TikTokWorkflow.tsx`
- [ ] Workflow rendering
- [ ] Step progress bar
- [ ] Back button
- [ ] Two-pane layout (left: actions, right: result)
- [ ] Tests included

**Step 9: Refactor Main Page**
- [ ] `TikTokJourneyPage.tsx` - 150 lines max
- [ ] Wrap with workflow context
- [ ] Route between Library and Workflow
- [ ] Loading states
- [ ] Error handling
- [ ] Tests included

**Quality Checks:**
- [ ] No component > 200 lines
- [ ] All props typed
- [ ] All components tested (80%+)
- [ ] Context not overused (only shared state)
- [ ] Mobile responsive
- [ ] Accessibility ARIA labels

---

## 🟢 PHASE 2: Design & UX (Week 2)

### Task 2.1: Modern UI Redesign
**Estimated:** 8-10 hours | **Assigned to:** Dev A

**Files to Create:**
- [ ] `src/styles/components/tiktok-accounts.css`
- [ ] `src/styles/components/tiktok-workflow.css`
- [ ] `src/styles/components/tiktok-cards.css`
- [ ] `src/styles/animations/transitions.css`
- [ ] `src/styles/themes/tiktok-dark-theme.css`

**Design System Variables:**
```css
:root {
  /* Colors */
  --color-primary: #0ea5e9;      /* Blue */
  --color-success: #10b981;      /* Green */
  --color-error: #ef4444;        /* Red */
  --color-warning: #f59e0b;      /* Orange */
  
  --color-bg-primary: #0f172a;   /* Dark navy */
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  
  /* Spacing */
  --spacing-unit: 8px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.15);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.2);
}
```

- [ ] Set variables
- [ ] Button styles (primary, secondary, danger, ghost)
- [ ] Card styles with hover states
- [ ] Input field styles
- [ ] Modal styles
- [ ] Grid/table styles
- [ ] Responsive breakpoints
- [ ] Dark/light theme colors
- [ ] Animations (fade, slide, scale)

**Quality Checks:**
- [ ] Contrast ratio >= 4.5:1 (AA) or 7:1 (AAA)
- [ ] Consistent spacing grid
- [ ] No magic numbers
- [ ] Mobile-first approach
- [ ] CSS organized by component

---

### Task 2.2: Loading States & Skeletons
**Estimated:** 4-6 hours | **Assigned to:** Dev A

**Components:**
- [ ] `src/components/Skeletons/SkeletonCard.tsx`
  - [ ] Pulsing animation
  - [ ] Proper dimensions
  - [ ] CSS animations
  
- [ ] `src/components/Skeletons/SkeletonTable.tsx`
  - [ ] Multiple rows
  - [ ] Column structure
  
- [ ] `src/components/Skeletons/SkeletonForm.tsx`
  - [ ] Form field skeletons
  - [ ] Button skeleton
  
- [ ] `src/components/LoadingStates/LoadingProgressBar.tsx`
  - [ ] Shows actual progress (0-100%)
  - [ ] Colors (primary, success, error)
  - [ ] Smooth animation
  
- [ ] `src/components/LoadingStates/LoadingSpinner.tsx`
  - [ ] Animated SVG spinner
  - [ ] Size options (sm, md, lg)
  
- [ ] `src/components/LoadingStates/ProgressWithText.tsx`
  - [ ] Progress bar + label
  - [ ] ETA if available

**CSS Animations:**
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] All animations use `prefers-reduced-motion`
- [ ] Tests included
- [ ] Accessibility: `role="status"` or `role="progressbar"`

---

### Task 2.3: Error Handling & Recovery UI
**Estimated:** 4-6 hours | **Assigned to:** Dev B

**Components:**
- [ ] `src/components/ErrorAlert.tsx`
  - [ ] Shows error icon
  - [ ] Error title + message
  - [ ] Help text
  - [ ] Retry button (if applicable)
  - [ ] Dismiss button
  
- [ ] `src/components/ErrorBoundary.tsx`
  - [ ] Catches React errors
  - [ ] Shows error UI
  - [ ] Reload button
  - [ ] Error details (dev only)
  
- [ ] `src/components/ValidationError.tsx`
  - [ ] Inline field error
  - [ ] Red color + icon
  - [ ] Below input field

**Error Types:**
- [ ] Network error (offline detection)
- [ ] API error (5xx server error)
- [ ] Validation error (4xx client error)
- [ ] Timeout error (retry logic)
- [ ] Rate limit error (wait + retry)
- [ ] Auth error (redirect to login)

**Features:**
- [ ] Helpful error messages (not "Error")
- [ ] Retry mechanism (exponential backoff)
- [ ] Fallback UI (recovery suggestions)
- [ ] Error logging (for debugging)
- [ ] Tests included

---

## 🟡 PHASE 3: Features & Functionality (Week 2)

### Task 3.1: Analytics & Event Tracking
**Estimated:** 3-4 hours | **Assigned to:** Dev A

- [ ] Create `src/services/analytics.ts`
  - [ ] `trackEvent(eventName, properties)`
  - [ ] Integration with Posthog / Mixpanel / etc.
  - [ ] Local event logging (dev mode)
  
- [ ] Events to track:
  - [ ] `tiktok_account_connected`
  - [ ] `tiktok_account_disconnected`
  - [ ] `service_validated`
  - [ ] `workflow_started`
  - [ ] `workflow_completed`
  - [ ] `workflow_failed`
  - [ ] `step_completed`
  - [ ] `error_occurred`
  
- [ ] Add tracking calls throughout app
- [ ] Tests included

---

### Task 3.2: Keyboard Shortcuts & Accessibility
**Estimated:** 3-4 hours | **Assigned to:** Dev B

- [ ] Create `src/hooks/useKeyboardShortcuts.ts`
  - [ ] `Ctrl/Cmd + K` - Open command palette
  - [ ] `Ctrl/Cmd + Enter` - Submit form / Next step
  - [ ] `Esc` - Close modal
  
- [ ] Create `src/components/CommandPalette.tsx`
  - [ ] Search/filter interface
  - [ ] Keyboard navigation
  - [ ] Command execution
  
- [ ] Accessibility improvements:
  - [ ] ARIA labels on all buttons
  - [ ] `aria-label` for icons
  - [ ] `role` attributes where needed
  - [ ] Focus indicators visible
  - [ ] Semantic HTML (button, form, etc.)
  - [ ] Color not only indicator
  
- [ ] Tests included (manual a11y audit)

---

### Task 3.3: Advanced Form Validation
**Estimated:** 4-5 hours | **Assigned to:** Dev B

- [ ] Create validation schemas with Zod:
  - [ ] `src/validation/serviceConnection.schema.ts`
  - [ ] `src/validation/workflowForm.schema.ts`
  
- [ ] Create `src/hooks/useFormValidation.ts`
  - [ ] Real-time field validation
  - [ ] Show field errors below input
  - [ ] Disable submit until valid
  - [ ] Submit validation
  
- [ ] Validation rules:
  - [ ] Required fields
  - [ ] URL format (HTTPS)
  - [ ] Min/max length
  - [ ] Email format
  - [ ] Custom rules (e.g., URL reachable)
  
- [ ] Error messages:
  - [ ] Clear + helpful
  - [ ] Point to specific issue
  - [ ] Suggest fix if possible
  
- [ ] Tests included

---

## 🔵 PHASE 4: Testing & Quality (Week 3)

### Task 4.1: Unit & Integration Tests
**Estimated:** 8-10 hours | **Assigned to:** Dev A

**Test Structure:**
```
__tests__/
├── components/
│   ├── TikTokAccountsPage.test.tsx
│   ├── TikTokLibrary.test.tsx
│   ├── TikTokWorkflow.test.tsx
│   ├── WorkflowSteps/
│   │   ├── CreationStep.test.tsx
│   │   ├── ScriptStep.test.tsx
│   │   ├── RenderStep.test.tsx
│   │   ├── UploadStep.test.tsx
│   │   └── PublishStep.test.tsx
│   ├── AccountsHeader.test.tsx
│   ├── TikTokAccountCard.test.tsx
│   ├── ServiceConnectionCard.test.tsx
│   └── ErrorAlert.test.tsx
├── hooks/
│   ├── useTikTokAccounts.test.ts
│   ├── useServiceConnections.test.ts
│   ├── useTikTokWorkflow.test.ts
│   ├── useAccountsForm.test.ts
│   └── useFormValidation.test.ts
├── services/
│   ├── analytics.test.ts
│   └── validation.test.ts
└── contexts/
    └── TikTokWorkflowContext.test.tsx
```

**Test Coverage Targets:**
- [ ] Components: 80%+ line coverage
- [ ] Hooks: 85%+ line coverage
- [ ] Services: 90%+ line coverage
- [ ] Critical paths: 100% coverage

**Example Tests:**
```typescript
// TikTokAccountsPage.test.tsx
describe('TikTokAccountsPage', () => {
  it('should render accounts when loaded', async () => {
    const { getByText } = render(<TikTokAccountsPage />);
    await waitFor(() => {
      expect(getByText('Mon compte')).toBeInTheDocument();
    });
  });

  it('should show error on disconnect failure', async () => {
    vi.mocked(disconnectAccount).mockRejectedValue(new Error('API error'));
    const { getByRole, getByText } = render(<TikTokAccountsPage />);
    
    fireEvent.click(getByRole('button', { name: /déconnecter/i }));
    
    await waitFor(() => {
      expect(getByText('API error')).toBeInTheDocument();
    });
  });
});

// useTikTokAccounts.test.ts
describe('useTikTokAccounts', () => {
  it('should fetch accounts on mount', async () => {
    const { result } = renderHook(() => useTikTokAccounts());
    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(1);
    });
  });
});
```

- [ ] Create test setup file
- [ ] Mock API responses
- [ ] Test utilities/helpers
- [ ] Generate coverage report

---

### Task 4.2: E2E & Visual Tests
**Estimated:** 4-6 hours | **Assigned to:** Dev A

**Playwright Tests:**
```bash
e2e/
├── accounts.spec.ts
├── workflow.spec.ts
├── navigation.spec.ts
└── accessibility.spec.ts
```

- [ ] Accounts page flow
  - [ ] Connect TikTok
  - [ ] Save service
  - [ ] Disconnect account
  
- [ ] Workflow flow
  - [ ] Generate ideas
  - [ ] Select idea
  - [ ] Generate script
  - [ ] Render video
  - [ ] Upload
  - [ ] Publish
  
- [ ] Navigation tests
  - [ ] Page transitions
  - [ ] Back button
  - [ ] URL changes
  
- [ ] Accessibility tests
  - [ ] Keyboard navigation
  - [ ] Focus management
  - [ ] Screen reader (ARIA)
  
- [ ] Visual regression tests
  - [ ] Percy or similar
  - [ ] Component screenshots
  - [ ] Dark/light themes

**Commands:**
```bash
npm run test:e2e                    # Run E2E tests
npm run test:e2e:ui                # Watch mode with UI
npm run test:accessibility         # Run a11y tests
npm run test:visual                # Run visual tests
```

---

### Task 4.3: Performance & Bundle Analysis
**Estimated:** 3-4 hours | **Assigned to:** Dev B

- [ ] Measure current state:
  ```bash
  npm run build:analyze     # Analyze bundle
  npm run lighthouse        # Lighthouse audit
  npm run bundle-size       # Check bundle size
  ```

- [ ] Optimize:
  - [ ] Code splitting (lazy load workflows)
  - [ ] Tree shaking (remove unused code)
  - [ ] Image optimization
  - [ ] CSS minification
  - [ ] Remove unused dependencies
  
- [ ] Targets:
  - [ ] Bundle size: <100 KB (gzipped)
  - [ ] LCP: <2000ms
  - [ ] INP: <100ms
  - [ ] CLS: <0.1
  - [ ] Lighthouse: >90

- [ ] Set up monitoring:
  - [ ] GitHub Actions for bundle check
  - [ ] Size limits in CI/CD

---

## ✅ Final Checklist

### All Code Complete
- [ ] All TypeScript types defined
- [ ] All components created & tested
- [ ] All hooks implemented & tested
- [ ] All styles updated
- [ ] All error handling in place
- [ ] All tests written (80%+ coverage)

### Quality Standards
- [ ] `npm run type-check` - No errors
- [ ] `npm run lint` - No warnings
- [ ] `npm run test` - All pass
- [ ] `npm run test:e2e` - All pass
- [ ] `npm run build` - Succeeds
- [ ] Bundle size < 100KB

### Design & UX
- [ ] Mobile responsive ✅
- [ ] Dark theme works ✅
- [ ] Accessibility WCAG AAA ✅
- [ ] Animations smooth ✅
- [ ] Error messages clear ✅
- [ ] Loading states good ✅

### Deployment
- [ ] Feature flags ready
- [ ] Gradual rollout plan
- [ ] Monitoring set up
- [ ] Rollback plan ready
- [ ] Team trained
- [ ] Documentation updated

### Metrics
- [ ] Bundle size tracked
- [ ] Performance metrics tracked
- [ ] Error rates monitored
- [ ] User feedback gathered
- [ ] Analytics working

---

## 🎯 Success Criteria

**MINIMUM SUCCESS (Week 1):**
- ✅ Code refactored to TypeScript
- ✅ Components split up
- ✅ Basic tests (60%+)

**GOOD SUCCESS (Week 2):**
- ✅ Modern design implemented
- ✅ Error handling complete
- ✅ Tests at 80%+
- ✅ Accessibility audit passed

**EXCELLENT SUCCESS (Week 3):**
- ✅ E2E tests passing
- ✅ Performance targets met
- ✅ Zero warnings/errors
- ✅ Ready for production

---

**Prepared:** May 3, 2026  
**Last Updated:** _____________  
**Status:** Ready to Start

For questions: See TIKTOK_PAGE_PROFESSIONAL_UPGRADE.md or TIKTOK_UPGRADE_EXECUTIVE.md
