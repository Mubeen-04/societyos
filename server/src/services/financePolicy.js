export const getRequiredExpenseApprovals = (amount, policy = {}) => {
  const treasurerOnlyMax = Number(policy.treasurerOnlyMax ?? 10000);
  const chairmanApprovalThreshold = Number(policy.chairmanApprovalThreshold ?? treasurerOnlyMax);
  const governanceReviewThreshold = Number(policy.governanceReviewThreshold ?? 50000);

  const approvals = ['TREASURER'];
  if (amount > chairmanApprovalThreshold) approvals.push('CHAIRMAN');
  const governanceReviewRequired = amount > governanceReviewThreshold;
  return { approvals, governanceReviewRequired };
};
