# GitHub collaboration steps

The project source is hosted at https://github.com/potatoes-00/final-project-forms. Each member should make genuine contributions through their own account.

1. The repository owner can invite the other group members as collaborators.
2. Keep `package-lock.json`, source, tests, and documentation. Do not upload `node_modules`, generated builds, `.openai` hosting metadata, real patient data, or credentials.
3. Clone the repository and create a branch for your changes:

```powershell
git clone https://github.com/potatoes-00/final-project-forms.git
cd final-project-forms
npm ci
git switch -c your-feature-branch
```

4. Every other member should clone the repository and make a genuine, reviewable contribution through their own account. Suggested independent tasks are improving patient validation, refining queue/search behavior, extending meaningful tests, and reviewing documentation/accessibility. These are suggestions, not a claimed contribution history. Use branches and pull requests where practical.
5. Run `npm ci`, `npm run build`, and `npm test` after merged changes. If behavior changes, regenerate screenshots/video/documentation so they match the submitted code.
6. Verify contributors with `git shortlog -sne --all`. Each member must have an authentic contribution. Do not change commit authors to simulate work by others.
7. Put the real repository URL in Canvas and in the submission checklist. Ensure your instructor can access it. List all group members in the submission comments.

The private Sites source repository used for hosting, if present, is deployment infrastructure. It is not evidence that every group member contributed to a course GitHub repository.
