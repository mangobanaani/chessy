# GitHub Actions Secrets Configuration

This document outlines the required and optional secrets for the CI/CD pipeline.

## Required Secrets

### GITHUB_TOKEN
- **Type**: Automatic
- **Description**: Automatically provided by GitHub Actions
- **Used for**: Container registry authentication, uploading SARIF results
- **Setup**: No action required - automatically available

## Optional Secrets (for enhanced security scanning)

### SNYK_TOKEN
- **Type**: Organization/Repository secret
- **Description**: Snyk API token for enhanced vulnerability scanning
- **Used for**: Advanced dependency vulnerability analysis
- **Setup**:
  1. Create account at [snyk.io](https://snyk.io)
  2. Generate API token in account settings
  3. Add as repository secret named `SNYK_TOKEN`
- **Fallback**: Pipeline continues without Snyk if not configured

### GITLEAKS_LICENSE
- **Type**: Organization/Repository secret  
- **Description**: GitLeaks commercial license (optional)
- **Used for**: Enhanced secret detection capabilities
- **Setup**:
  1. Purchase GitLeaks commercial license
  2. Add license key as repository secret named `GITLEAKS_LICENSE`
- **Fallback**: Uses free version if not configured

## Setting Up Secrets

### Repository Level
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the secret name and value

### Organization Level (for multiple repositories)
1. Go to your organization settings
2. Click **Secrets and variables** → **Actions**
3. Click **New organization secret**
4. Add the secret and select repository access

## Security Best Practices

### Secret Rotation
- Rotate API tokens every 90 days
- Use short-lived tokens when possible
- Monitor secret usage in Actions logs

### Access Control
- Use organization secrets for shared credentials
- Limit repository access to necessary repos only
- Review secret access regularly

### Audit Trail
- All secret usage is logged in Actions
- Monitor for unexpected secret access
- Set up alerts for failed secret access

## Pipeline Behavior Without Secrets

The pipeline is designed to work without optional secrets:

- **No SNYK_TOKEN**: Skips Snyk scanning, uses other vulnerability tools
- **No GITLEAKS_LICENSE**: Uses free GitLeaks version
- **Missing secrets**: Pipeline continues with warnings, doesn't fail

## Troubleshooting

### Common Issues

#### Secret Not Found Error
```yaml
Error: The secret `SECRET_NAME` was not found
```
**Solution**: Verify secret name spelling and access permissions

#### Permission Denied
```yaml
Error: Resource not accessible by integration
```
**Solution**: Check repository permissions and token scopes

#### API Rate Limits
```yaml
Error: API rate limit exceeded
```
**Solution**: Wait for rate limit reset or upgrade service plan

### Debugging Steps

1. Check secret exists in repository/organization settings
2. Verify secret name matches exactly in workflow file
3. Ensure repository has access to organization secrets
4. Check Actions logs for detailed error messages
5. Test with minimal workflow to isolate issues

## Security Scanning Tools Summary

| Tool | Purpose | Required Secret | Fallback |
|------|---------|----------------|----------|
| Trivy | Container/FS scanning | None | N/A |
| Docker Scout | Advanced container scanning | None | N/A |
| CodeQL | Security code analysis | None | N/A |
| Hadolint | Dockerfile linting | None | N/A |
| Checkov | IaC security scanning | None | N/A |
| Snyk | Dependency vulnerabilities | SNYK_TOKEN | Skip step |
| GitLeaks | Secret detection | GITLEAKS_LICENSE | Free version |
| TruffleHog | Secret detection | None | N/A |

## Monitoring and Alerts

### GitHub Security Tab
- All SARIF results automatically uploaded
- Vulnerability alerts created for findings
- Dependency security advisories
- Code scanning alerts

### Recommended Notifications
- Enable email notifications for security alerts
- Set up Slack/Teams integration for critical findings
- Configure dependency update notifications
- Monitor workflow failure alerts
