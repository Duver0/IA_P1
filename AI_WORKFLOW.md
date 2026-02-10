# AI Workflow - AI Interaction Strategy

## AI-First Methodology

This project uses an **AI-First** methodology where the AI acts as a "Junior Developer" generating initial code that is then reviewed and refined by the team.

## Tools Used

- **GitHub Copilot**: Code generation and intelligent autocompletion.
- **Cursor**: AI-assisted code review and refactoring.

## Interaction Process

1. **Initial generation**: The AI generates the base project structure, including Docker configurations, microservices, and frontend components.
2. **Human review**: The team reviews the generated code, paying special attention to areas marked with `// ⚕️ HUMAN CHECK`.
3. **Refinement**: The code is adjusted according to best practices and project-specific requirements.
4. **Validation**: Tests are run and the correct functioning of the system is verified.

## Sentinel Comments

`// ⚕️ HUMAN CHECK` comments are used in the following critical areas:

- Docker Compose configuration (ports, networks, volumes)
- Dockerfiles (base image versions)
- Environment variables (credentials and sensitive configuration)
- RabbitMQ configuration (queues, exchanges, credentials)
- API endpoints (validation and security)

## What the AI Got Wrong

- The AI tends to generate configurations with default credentials (e.g., `guest/guest` in RabbitMQ) that must be changed in production.
- In some cases, the AI does not include adequate input validations in the endpoints.
- The Docker configurations initially generated do not always optimize the use of cache layers.
- The AI may generate dependencies with outdated or mutually incompatible versions.

## Interaction Dynamics

- **Boilerplate**: The AI generates the entire initial project structure without manual code writing.
- **Peer review**: Each PR is reviewed by at least one team member before merging.
- **Continuous iteration**: The team iterates on the generated code, progressively improving quality.
