/**
 * Helper to map employee and user names to their corresponding face mugshot avatar images.
 */
export function getEmployeeAvatar(name: string): string {
  const n = name ? name.toLowerCase() : "";
  
  if (n.includes("sarah")) {
    return "/animoji_employee.jpg";
  }
  if (n.includes("marcus")) {
    return "/animoji_approver.jpg";
  }
  if (n.includes("dan")) {
    return "/animoji_finance.jpg";
  }
  
  // Fallbacks for other mock names in mock claims
  if (n.includes("daniel")) {
    return "/animoji_employee.jpg";
  }
  if (n.includes("michael") || n.includes("robert")) {
    return "/animoji_finance.jpg";
  }
  if (n.includes("jennifer") || n.includes("priya") || n.includes("aisyah")) {
    return "/animoji_employee.jpg";
  }
  if (n.includes("lisa")) {
    return "/animoji_approver.jpg";
  }
  
  // Default fallback
  return "/animoji_employee.jpg";
}
