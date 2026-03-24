# Checklist: 01-approval-urgency-card

## Phase 1.0 — Tests (Red Phase)

### FR1: ApprovalUrgencyCard renders correctly
- [ ] test(FR1): SC1.1 — renders without crash for pendingCount=1
- [ ] test(FR1): SC1.2 — renders without crash for pendingCount=3
- [ ] test(FR1): SC1.3 — displays "1 Pending Team Request" (singular) for pendingCount=1
- [ ] test(FR1): SC1.4 — displays "3 Pending Team Requests" (plural) for pendingCount=3
- [ ] test(FR1): SC1.5 — count badge shows correct number
- [ ] test(FR1): SC1.6 — "Review Now" CTA text visible
- [ ] test(FR1): SC1.7 — "ACTION REQUIRED" label text visible
- [ ] test(FR1): SC1.8 — subtitle "Review before end of week" visible
- [ ] test(FR1): SC1.9 — source uses GlassCard with elevated=true and borderAccentColor=colors.desatCoral
- [ ] test(FR1): SC1.10 — source uses padding='md' and radius='2xl' on GlassCard
- [ ] test(FR1): SC1.11 — renders without crash for pendingCount=0

### FR2: Home screen shows card when isManager && pending > 0
- [ ] test(FR2): SC2.1 — source imports ApprovalUrgencyCard from @/src/components/ApprovalUrgencyCard
- [ ] test(FR2): SC2.2 — source imports useApprovalItems from @/src/hooks/useApprovalItems
- [ ] test(FR2): SC2.3 — source contains conditional rendering gated by isManager and approvalItems.length > 0
- [ ] test(FR2): SC2.4 — source passes pendingCount={approvalItems.length}
- [ ] test(FR2): SC2.5 — source passes onPress with router.push('/(tabs)/approvals')
- [ ] test(FR2): SC2.6 — card renders when isManager=true, items.length=2
- [ ] test(FR2): SC2.7 — card does NOT render when items.length=0
- [ ] test(FR2): SC2.8 — card does NOT render when isManager=false

### FR3: Overview screen shows card when isManager && pending > 0
- [ ] test(FR3): SC3.1 — source imports ApprovalUrgencyCard from @/src/components/ApprovalUrgencyCard
- [ ] test(FR3): SC3.2 — source imports useApprovalItems from @/src/hooks/useApprovalItems
- [ ] test(FR3): SC3.3 — source contains conditional rendering gated by isManager and approvalItems.length > 0
- [ ] test(FR3): SC3.4 — source passes pendingCount={approvalItems.length}
- [ ] test(FR3): SC3.5 — source passes onPress with router.push('/(tabs)/approvals')

### FR4: Breathing animation gated on useReducedMotion
- [ ] test(FR4): SC4.1 — source imports useReducedMotion from react-native-reanimated
- [ ] test(FR4): SC4.2 — source applies animationName with scale 1 -> 1.02
- [ ] test(FR4): SC4.3 — source uses animationDuration '1500ms'
- [ ] test(FR4): SC4.4 — source uses animationTimingFunction 'ease-in-out'
- [ ] test(FR4): SC4.5 — source uses animationIterationCount 'infinite'
- [ ] test(FR4): SC4.6 — source uses animationDirection 'alternate'
- [ ] test(FR4): SC4.7 — when reducedMotion=true, breathing style NOT applied
- [ ] test(FR4): SC4.8 — source gates pulse animation via useEffect with reducedMotion check

### FR5: onPress navigates to Requests tab
- [ ] test(FR5): SC5.1 — pressing CTA calls onPress exactly once
- [ ] test(FR5): SC5.2 — onPress called with no arguments (or ignored native event)
- [ ] test(FR5): SC5.3 — source wires onPress to AnimatedPressable for "Review Now" CTA

## Phase 1.1 — Implementation (Green Phase)

### FR1: ApprovalUrgencyCard component
- [ ] feat(FR1): create src/components/ApprovalUrgencyCard.tsx
- [ ] feat(FR1): implement GlassCard wrapper (elevated=true, desatCoral border, md padding, 2xl radius)
- [ ] feat(FR1): implement header row with Ionicons time-outline, SectionLabel, count badge
- [ ] feat(FR1): implement title with pluralization (pendingCount === 1 ? singular : plural)
- [ ] feat(FR1): implement subtitle "Review before end of week"
- [ ] feat(FR1): implement AnimatedPressable "Review Now" CTA wired to onPress prop

### FR2: Home screen integration
- [ ] feat(FR2): add ApprovalUrgencyCard import to app/(tabs)/index.tsx
- [ ] feat(FR2): add useApprovalItems hook call to app/(tabs)/index.tsx
- [ ] feat(FR2): add conditional card JSX as first ScrollView child (isManager && approvalItems.length > 0)

### FR3: Overview screen integration
- [ ] feat(FR3): add ApprovalUrgencyCard import to app/(tabs)/overview.tsx
- [ ] feat(FR3): add useApprovalItems hook call to app/(tabs)/overview.tsx
- [ ] feat(FR3): add conditional card JSX as first ScrollView child (isManager && approvalItems.length > 0)

### FR4: Animation implementation
- [ ] feat(FR4): implement breathing style object (Reanimated 4 CSS animation API)
- [ ] feat(FR4): implement pulsing border ring (absolute Animated.View + SharedValue loop)
- [ ] feat(FR4): gate both animations on useReducedMotion()

### FR5: onPress wiring
- [ ] feat(FR5): confirm AnimatedPressable onPress prop correctly plumbed to "Review Now" CTA
- [ ] feat(FR5): verify screens pass () => router.push('/(tabs)/approvals') as onPress

## Phase 1.2 — Review

### Spec-Implementation Alignment
- [ ] Run spec-implementation-alignment agent on spec.md vs implementation
- [ ] Verify all FR success criteria match implementation

### PR Review
- [ ] Run pr-review-toolkit:review-pr on the feature branch
- [ ] Address any critical/high issues raised

### Test Optimization
- [ ] Run test-optimiser on ApprovalUrgencyCard test file
- [ ] Remove redundant assertions, add missing edge-case coverage if found

### Final Checks
- [ ] All tests passing (npm test -- --testPathPattern=ApprovalUrgencyCard)
- [ ] No TypeScript errors in new/modified files
- [ ] checklist.md marked complete with session notes
- [ ] FEATURE.md changelog updated
