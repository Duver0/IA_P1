v1.0.2

- Redesign medico consultorio panel with a compact single-view layout focused on current state visibility.
- Replace technical consultorio labels with human-readable state language and color-coded status banner.
- Convert action labels to clear user-facing wording and keep contextual action visibility rules intact.
- Integrate patient summary next to consultorio state and remove split-card reading flow.
- Add explicit in-panel processing feedback during command execution and align medico page tests with new UX copy.

v1.0.1

- Close feature for producer outbox + consumer observability in simulated production with structured logs and basic alerts.
- Add producer outbox metrics and repeated-failure/batch-failure alert thresholds.
- Add consumer processing metrics, DLQ growth alert threshold, and correlation fields by commandId/userId.
- Add operational environment variables in docker-compose for outbox and DLQ observability tuning.
- Validate end-to-end flow: medico signup, outbox processed, doctor provisioned, consultorio assignment successful.
- Validate controlled business-failure route to DLQ with structured terminal error evidence.
- Update technical documentation with Definition of Done, residual risks, next iteration, and validated checklist.

v1.0.0

- Add MVP foundation with basic project structure for frontend, producer (backend), and consumer (backend) services.
- Add Docker Compose configuration for local development environment with MongoDB, RabbitMQ, and service orchestration.
- Add initial CI/CD pipeline with GitHub Actions for linting, type checking, and basic test execution with multilevel testing jobs (component, integration, build validation).
- Add Jest and React Testing Library setup for unit and integration testing.
- Add TypeScript strict mode configuration across all services.
- Add basic API skeleton for appointment scheduling system.
- Add authentication feature for frontend module with Sign Up, Sign In, and Route Protection flows.
- Add `AuthProvider` component for global authentication state management using React Context.
- Add `SignUpForm` and `SignInForm` components with input validation and sanitization.
- Add `AuthGuard` component for route protection based on authentication status and user roles.
- Add `HttpAuthAdapter` for HTTP communication with authentication endpoints.
- Add comprehensive test plan (`TEST_PLAN_FRONT.md`) covering White-Box and Black-Box testing strategies.
- Add JWT token storage in secure HTTP-only cookies and session validation on page reload.
- Fix Docker network configuration to isolate services properly.
- Fix Dockerfile configurations with multi-stage builds and non-root user execution for security compliance.
