---
description: Review documentation updates needed and suggest SOPs for repeating processes
---

Review the changes made in this session, identify documentation updates, and suggest SOPs for repeating processes.

## Your Task

1. Analyze the session for documentation updates needed
2. Identify any repeating processes that should become SOPs

---

## Part A: Documentation Updates

### Step 1: Analyze Session Changes

Review all files that were:
- Created or modified
- Discussed or debugged
- Features implemented or bugs fixed

### Step 2: Map to Documentation Sections

| Change Type | Documentation Section |
|-------------|----------------------|
| UI route/component behavior | `docs/frontend-experience/` |
| Convex schema/query/mutation logic | `docs/convex-backend/` |
| Whop or inference integration changes | `docs/ai-whop-integrations/` |
| Test setup/coverage/CI workflow | `docs/testing-ci/` |
| Branching/release/deployment updates | `docs/operations-release/` |
| Cross-cutting design changes | `docs/architecture/` |

### Step 3: Categorize Updates

- **New Feature**: Needs new documentation file or section
- **Bug Fix**: Add to relevant `troubleshooting.md` with symptom -> cause -> fix
- **Architecture Change**: Update overview and INDEX.md files
- **Issue Encountered**: Document with prevention tips
- **API Change**: Update implementation docs and examples

---

## Part B: SOP Detection

### Step 4: Identify Repeating Processes

Look for processes that were performed that are likely to be repeated:

**SOP-worthy processes include:**
- Multi-step setup or configuration procedures
- Debugging workflows that follow specific steps
- Deployment or release processes
- Integration with external services
- Data migrations or transformations
- Incident response procedures

**Questions to ask:**
1. Did we follow a multi-step process to accomplish something?
2. Would someone need to repeat these exact steps in the future?
3. Were there non-obvious steps or gotchas that need to be remembered?
4. Is this process complex enough that it would be hard to remember?

### Step 5: Check for Existing SOPs

Before suggesting a new SOP, check if one exists in `docs/sop/`

---

## Output Format

```markdown
## Session Review Results

### Documentation Updates Needed

#### Required Updates
- [ ] `docs/section/file.md` - Description of what to add/update
  - **Code change**: What changed
  - **Document**: What should be documented

#### Optional Improvements
- [ ] `docs/section/file.md` - Enhancement suggestion

### SOPs to Create

#### New SOP: [Process Name]
- **File**: `docs/sop/[process-name].md`
- **Purpose**: Why this SOP is needed
- **Trigger**: When would someone need this?
- **Steps identified in session**:
  1. Step one
  2. Step two
- **Gotchas to document**: Non-obvious things discovered

### No Updates Needed
- [Explain why if applicable]
```
