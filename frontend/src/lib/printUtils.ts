// Print generation functions for coordinator dashboard

export interface TravelHistory {
  _id: string;
  busId: {
    _id: string;
    name: string;
    busId: string;
  } | null;
  routeId: {
    _id: string;
    name: string;
  } | null;
  departureTime: string;
  distance: number;
  passengers: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

export interface FuelRecord {
  _id: string;
  busId: {
    _id: string;
    name: string;
    busId: string;
  } | null;
  date: string;
  fuelType: "petrol" | "diesel" | "cng" | "electric";
  liters: number;
  costPerLiter: number;
  totalCost: number;
  fuelStation: string;
}

export interface Bus {
  _id: string;
  name: string;
  busId: string;
}

export function generateTravelHistoryPrint(filteredHistory: TravelHistory[], selectedBusId: string, buses: Bus[]): string {
  const selectedBus = selectedBusId ? buses.find((bus) => bus._id === selectedBusId) : null;
  const title = selectedBus ? `Travel History - ${selectedBus.name} (${selectedBus.busId})` : "Travel History - All Buses";
  const totalDistance = filteredHistory.reduce((sum, trip) => sum + trip.distance, 0);
  const completedTrips = filteredHistory.filter((t) => t.status === "completed").length;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; background: #f5f5f5; padding: 15px; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
        .stat-label { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .status-completed { color: #008000; }
        .status-in-progress { color: #0066cc; }
        .status-cancelled { color: #cc0000; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        @media print { 
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Loopr: BAIUST Transit</h1>
        <h2>${title}</h2>
        <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${filteredHistory.length}</div>
          <div class="stat-label">Total Trips</div>
        </div>
        <div class="stat">
          <div class="stat-value">${completedTrips}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${filteredHistory.filter((t) => t.status === "in-progress").length}</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalDistance}</div>
          <div class="stat-label">Total Distance (km)</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Bus</th>
            <th>Route</th>
            <th>Departure</th>
            <th>Distance (km)</th>
            <th>Passengers</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredHistory
            .map(
              (trip) => `
            <tr>
              <td>${trip.busId?.name || "N/A"}</td>
              <td>${trip.routeId?.name || "N/A"}</td>
              <td>${new Date(trip.departureTime).toLocaleDateString()} ${new Date(trip.departureTime).toLocaleTimeString()}</td>
              <td>${trip.distance}</td>
              <td>${trip.passengers}</td>
              <td class="status-${trip.status}">${trip.status}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Loopr: BAIUST Transit Management System - Confidential Report</p>
      </div>
    </body>
    </html>
  `;
}

export function generateFuelRecordsPrint(filteredRecords: FuelRecord[], selectedBusId: string, buses: Bus[]): string {
  const selectedBus = selectedBusId ? buses.find((bus) => bus._id === selectedBusId) : null;
  const title = selectedBus ? `Fuel Records - ${selectedBus.name} (${selectedBus.busId})` : "Fuel Records - All Buses";
  const totalCost = filteredRecords.reduce((sum, record) => sum + record.totalCost, 0);
  const totalLiters = filteredRecords.reduce((sum, record) => sum + record.liters, 0);
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; background: #f5f5f5; padding: 15px; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #cc0066; }
        .stat-label { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        @media print { 
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Loopr: BAIUST Transit</h1>
        <h2>${title}</h2>
        <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${filteredRecords.length}</div>
          <div class="stat-label">Total Records</div>
        </div>
        <div class="stat">
          <div class="stat-value">৳${totalCost.toLocaleString()}</div>
          <div class="stat-label">Total Cost</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalLiters.toLocaleString()}L</div>
          <div class="stat-label">Total Liters</div>
        </div>
        <div class="stat">
          <div class="stat-value">৳${avgCostPerLiter.toFixed(2)}</div>
          <div class="stat-label">Avg Cost/Liter</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Bus</th>
            <th>Date</th>
            <th>Fuel Type</th>
            <th>Liters</th>
            <th>Cost/L (৳)</th>
            <th>Total (৳)</th>
            <th>Station</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRecords
            .map(
              (record) => `
            <tr>
              <td>${record.busId?.name || "N/A"}</td>
              <td>${new Date(record.date).toLocaleDateString()}</td>
              <td style="text-transform: capitalize">${record.fuelType}</td>
              <td>${record.liters}L</td>
              <td>৳${record.costPerLiter}</td>
              <td>৳${record.totalCost.toLocaleString()}</td>
              <td>${record.fuelStation || "N/A"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Loopr: BAIUST Transit Management System - Confidential Report</p>
      </div>
    </body>
    </html>
  `;
}
