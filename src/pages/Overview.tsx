import '../styles/MainLayout.css';

export default function Overview() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Overview</h1>
        <p>Dashboard overview and key metrics</p>
      </div>
      <div className="content-card">
        <h2>Welcome to Rodeo Drive CRM</h2>
        <p>This is your dashboard overview page. Here you can view key metrics, recent activities, and system status.</p>
      </div>
    </div>
  );
}
