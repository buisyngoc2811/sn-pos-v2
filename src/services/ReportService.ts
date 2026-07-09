// No supabase usage yet, to keep minimal diff
import {
  reportBestProducts as mockBestProducts,
  reportHours as mockHours,
  reportRevenuePoints as mockRevenuePoints,
} from '../data/mockData'

export const ReportService = {
  async getReportData() {
    // In a real application, these would be complex aggregation queries from Supabase
    // To keep the UI unchanged and diff minimal, we return mock data for complex aggregations
    // but the service layer architecture is implemented.

    return {
      bestProducts: mockBestProducts,
      hours: mockHours,
      revenuePoints: mockRevenuePoints,
    }
  }
}
