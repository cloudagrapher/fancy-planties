---
inclusion: always
---

# File Organization and Management

## Directory Structure Guidelines

### Summary Documents

- Place all summary documents in `.kiro/summaries/` to maintain a clean root directory
- Use descriptive filenames that indicate the content scope (e.g., `api-endpoints-summary.md`, `component-architecture-summary.md`)

### Project Organization

- Keep the root directory minimal and focused on essential configuration files
- Use appropriate subdirectories for different types of documentation and artifacts
- Maintain consistent naming conventions across all directories

## File Management Best Practices

### Documentation Placement

- **Technical summaries**: `.kiro/summaries/`
- **Architecture docs**: `docs/`
- **API documentation**: `docs/API.md`
- **Development guides**: `docs/`

### Temporary Files

- Avoid creating temporary files in the root directory
- Use appropriate subdirectories or system temp locations
- Clean up generated files that are not needed for version control

### Version Control Considerations

- Keep generated files (coverage reports, build artifacts) in appropriate directories
- Ensure `.gitignore` properly excludes temporary and build files
- Maintain clean commit history by organizing files logically
