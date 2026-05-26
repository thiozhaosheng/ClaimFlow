export default function LoginIllustration() {
  return (
    <div className="login-illustration" aria-hidden="true">
      <div className="illus-blob illus-blob-1"></div>
      <div className="illus-blob illus-blob-2"></div>
      <div className="illus-blob illus-blob-3"></div>

      {/* notification floating in */}
      <div
        className="illus-notification"
        data-aos="fade-down"
        data-aos-delay="450"
      >
        <div className="illus-notification-icon">
          <i className="fa-solid fa-bell"></i>
        </div>
        <div className="illus-notification-text">
          <strong>New claim submitted</strong>
          <span>Michael Chen · Travel · $450</span>
        </div>
      </div>

      {/* main review mockup */}
      <div className="illus-review" data-aos="zoom-in" data-aos-delay="200">
        <div className="illus-review-header">
          <div className="illus-review-avatar">SJ</div>
          <div className="illus-review-meta">
            <div className="illus-review-name">Sarah Johnson</div>
            <div className="illus-review-sub">Sales · CLM-001</div>
          </div>
          <span className="illus-badge illus-badge-pending">Pending</span>
        </div>

        <div className="illus-receipt">
          <div className="illus-receipt-photo">
            <i className="fa-regular fa-image"></i>
          </div>
          <div className="illus-receipt-rows">
            <div className="illus-receipt-row" style={{ width: "78%" }}></div>
            <div className="illus-receipt-row" style={{ width: "58%" }}></div>
            <div className="illus-receipt-row" style={{ width: "70%" }}></div>
            <div className="illus-receipt-row illus-receipt-total"></div>
          </div>
        </div>

        <div className="illus-review-details">
          <div className="illus-detail">
            <span className="illus-detail-label">Amount</span>
            <span className="illus-detail-value">$145.50</span>
          </div>
          <div className="illus-detail">
            <span className="illus-detail-label">Category</span>
            <span className="illus-detail-value">Meal</span>
          </div>
          <div className="illus-detail">
            <span className="illus-detail-label">Date</span>
            <span className="illus-detail-value">May 11</span>
          </div>
        </div>

        <div className="illus-review-actions">
          <div className="illus-action illus-action-approve">
            <i className="fa-solid fa-check"></i> Approve
          </div>
          <div className="illus-action illus-action-reject">
            <i className="fa-solid fa-xmark"></i> Reject
          </div>
        </div>
      </div>

      {/* stat floating below */}
      <div
        className="illus-stat-floating"
        data-aos="fade-up"
        data-aos-delay="550"
      >
        <div className="illus-stat-floating-icon">
          <i className="fa-solid fa-bolt"></i>
        </div>
        <div className="illus-stat-floating-text">
          <strong>2 min avg</strong>
          <span>Time to approve</span>
        </div>
      </div>
    </div>
  );
}
