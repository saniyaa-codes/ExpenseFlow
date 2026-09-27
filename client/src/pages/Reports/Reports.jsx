import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, CheckCircle2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import api, { downloadTransactionsCSV } from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import './Reports.css';

export default function Reports() {
  const { formatAmount } = useCurrency();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get('/reports/monthly');
        if (res.success) {
          setReport(res.data);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, []);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await downloadTransactionsCSV();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Monthly Financial Report</h2>
          <p className="ef-page-subtitle">Executive summary of income, expenses, and budget compliance.</p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={Download}
          onClick={handleExportCSV}
          isLoading={isExporting}
        >
          Download Full CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="ef-table-loading">Generating report...</div>
      ) : report ? (
        <div className="ef-report-wrapper">
          {/* Executive Overview */}
          <div className="surface-card ef-report-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Executive Summary — August 2026</h3>
                <span className="ef-card-subtitle">{report.transactionCount} transactions processed</span>
              </div>
            </div>

            <div className="ef-report-stats-grid">
              <div className="ef-rstat-item">
                <span>Total Income</span>
                <strong className="text-income">+{formatAmount(report.totalIncome)}</strong>
              </div>
              <div className="ef-rstat-item">
                <span>Total Expenses</span>
                <strong className="text-expense">-{formatAmount(report.totalExpense)}</strong>
              </div>
              <div className="ef-rstat-item">
                <span>Net Cashflow Savings</span>
                <strong style={{ color: 'var(--color-primary)' }}>{formatAmount(report.netSavings)}</strong>
              </div>
              <div className="ef-rstat-item">
                <span>Savings Rate</span>
                <strong>{report.savingsRate}%</strong>
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="surface-card ef-report-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Category Distribution</h3>
              </div>
            </div>

            <table className="ef-data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Share of Spending</th>
                </tr>
              </thead>
              <tbody>
                {report.categoryBreakdown.map((c) => {
                  const share = report.totalExpense > 0 ? Math.round((c.amount / report.totalExpense) * 100) : 0;
                  return (
                    <tr key={c.category}>
                      <td><strong>{c.category}</strong></td>
                      <td>{formatAmount(c.amount)}</td>
                      <td>{share}% of monthly total</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
