import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Badge from '../../components/common/Badge';
import './HealthPage.css';

export default function HealthPage() {
  const { formatAmount } = useCurrency();
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health/score');
        if (res.success) {
          setHealthData(res.data);
        }
      } catch (err) {
        console.error('Failed to load health score:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Financial Health Assessment</h2>
          <p className="ef-page-subtitle">Algorithmic analysis of savings velocity, budget discipline, and liquidity.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="ef-table-loading">Evaluating financial health metrics...</div>
      ) : healthData ? (
        <div className="ef-health-page-grid">
          {/* Main Score Hero Card */}
          <div className="surface-card ef-score-hero-card">
            <div className="ef-score-circle-wrap">
              <div className="ef-score-number">{healthData.score}</div>
              <span className="ef-score-max">/ 100</span>
            </div>

            <div className="ef-score-meta">
              <Badge variant={healthData.rating === 'Excellent' ? 'success' : 'warning'} size="md">
                {healthData.rating} Status
              </Badge>
              <p className="ef-score-desc">
                Your financial profile shows strong savings habits and disciplined cashflow.
              </p>
            </div>
          </div>

          {/* Factor Breakdown Grid */}
          <div className="surface-card ef-factors-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Algorithm Factor Breakdown</h3>
                <span className="ef-card-subtitle">5 deterministic financial pillars</span>
              </div>
            </div>

            <div className="ef-factors-list">
              <div className="ef-factor-row">
                <div className="ef-factor-info">
                  <strong>Savings Rate Ratio</strong>
                  <span>Current month surplus vs total income</span>
                </div>
                <div className="ef-factor-score">
                  <strong>{healthData.factorBreakdown.savingsRate.score} / {healthData.factorBreakdown.savingsRate.max} pts</strong>
                </div>
              </div>

              <div className="ef-factor-row">
                <div className="ef-factor-info">
                  <strong>Budget Adherence</strong>
                  <span>Category spending compliance with budget caps</span>
                </div>
                <div className="ef-factor-score">
                  <strong>{healthData.factorBreakdown.budgetAdherence.score} / {healthData.factorBreakdown.budgetAdherence.max} pts</strong>
                </div>
              </div>

              <div className="ef-factor-row">
                <div className="ef-factor-info">
                  <strong>Emergency Reserve Cushion</strong>
                  <span>Months of living expenses covered by net balance</span>
                </div>
                <div className="ef-factor-score">
                  <strong>{healthData.factorBreakdown.emergencyCushion.score} / {healthData.factorBreakdown.emergencyCushion.max} pts</strong>
                </div>
              </div>

              <div className="ef-factor-row">
                <div className="ef-factor-info">
                  <strong>Savings Goals Progress</strong>
                  <span>Active milestone goal completion percentage</span>
                </div>
                <div className="ef-factor-score">
                  <strong>{healthData.factorBreakdown.savingsGoals.score} / {healthData.factorBreakdown.savingsGoals.max} pts</strong>
                </div>
              </div>

              <div className="ef-factor-row">
                <div className="ef-factor-info">
                  <strong>Recurring Burden Ratio</strong>
                  <span>Fixed obligations relative to total earnings</span>
                </div>
                <div className="ef-factor-score">
                  <strong>{healthData.factorBreakdown.recurringBurden.score} / {healthData.factorBreakdown.recurringBurden.max} pts</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Highlights & Recommendations */}
          <div className="surface-card ef-insights-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Highlights & Next Steps</h3>
              </div>
            </div>

            <div className="ef-insights-body">
              {healthData.positiveHighlights.map((item, idx) => (
                <div key={idx} className="ef-health-pill ef-health-pill--pos">
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}

              {healthData.actionRecommendations.map((item, idx) => (
                <div key={idx} className="ef-health-pill ef-health-pill--rec">
                  <AlertCircle size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
