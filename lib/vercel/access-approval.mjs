import { ServiceError } from '../workspace-service.js';

export class OwnerApprovalRequired extends ServiceError {
  constructor() {
    super(403, 'Your account needs approval from the MONETA owner.');
    this.code = 'MONETA_APPROVAL_REQUIRED';
  }
}

export function requireOwnerApproval(user, environment = process.env) {
  const required = environment.VERCEL_ENV === 'production'
    || environment.MONETA_REQUIRE_APPROVAL === '1';
  if (required && user?.privateMetadata?.monetaAccess !== 'approved') {
    throw new OwnerApprovalRequired();
  }
}

export function isApprovalRequired(error) {
  return error instanceof OwnerApprovalRequired;
}
