---
name: Pull Request
about: Submit changes to the Port Community System
title: ''
labels: ['needs-review', 'size/${size}', 'priority/${priority}', 'type/${type}']
reviewers: ['${team_lead}', '${security_reviewer}', '${performance_reviewer}']
---

## Description

### Summary
<!-- Provide a clear and concise summary of your changes -->

### Motivation
<!-- Explain the business justification and technical rationale for these changes -->

### Impact Analysis
<!-- Describe the impact of these changes on system components and stakeholders -->

## Type of Change
<!-- Check all that apply -->
- [ ] New Feature
- [ ] Enhancement
- [ ] Bug Fix
- [ ] Performance Improvement
- [ ] Security Update
- [ ] Documentation Update
- [ ] Configuration Change
- [ ] Dependency Update
- [ ] Breaking Change

## Components Affected
<!-- Check all components impacted by these changes -->
- [ ] API Gateway
- [ ] Core Services
- [ ] Document Service
- [ ] Notification Service
- [ ] Web Frontend
- [ ] Database
- [ ] Cache Layer
- [ ] Message Queue
- [ ] Search Service
- [ ] Infrastructure
- [ ] Security Controls
- [ ] Monitoring System

## Security Compliance
<!-- Verify all security and compliance requirements are met -->
- [ ] Security scan passed
- [ ] GDPR compliance verified
- [ ] ISO 27001 requirements met
- [ ] Port regulations compliance checked
- [ ] Data encryption standards followed
- [ ] Access control policies updated
- [ ] Security documentation updated

## Performance Impact
### Performance Metrics
<!-- Check all performance aspects that were evaluated -->
- [ ] Response time impact assessed
- [ ] Resource utilization measured
- [ ] Load testing performed
- [ ] Scalability verified
- [ ] Database performance checked
- [ ] Cache efficiency evaluated

### Performance Data
<!-- Provide quantitative performance metrics and comparison with baseline -->
```
Before changes:
- Response time: 
- Resource usage:
- Throughput:

After changes:
- Response time:
- Resource usage:
- Throughput:
```

## Testing
### Test Coverage
<!-- Check all types of tests performed -->
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] Performance Tests
- [ ] Security Tests
- [ ] Compliance Tests
- [ ] UI/UX Tests
- [ ] API Tests
- [ ] Database Tests

### Test Results
<!-- Provide test coverage metrics and results -->
```
Coverage metrics:
- Line coverage:
- Branch coverage:
- Function coverage:

Test results:
- Total tests:
- Passed:
- Failed:
- Skipped:
```

## Pipeline Status
<!-- CI/CD pipeline status -->
- Build: ![Build Status](${BUILD_BADGE_URL})
- Tests: ![Test Status](${TEST_BADGE_URL})
- Security Scan: ![Security Status](${SECURITY_BADGE_URL})
- Performance: ![Performance Status](${PERFORMANCE_BADGE_URL})

## Reviewer Checklist
<!-- For reviewers to verify -->
- [ ] Code follows project standards and guidelines
- [ ] Changes are properly documented
- [ ] Security implications have been considered
- [ ] Performance impact is acceptable
- [ ] Tests are comprehensive and passing
- [ ] CI/CD pipeline is successful