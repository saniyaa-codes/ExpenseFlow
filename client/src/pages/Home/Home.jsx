import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  LogIn,
  Receipt,
  PiggyBank,
  Target,
  Bot,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import Button from '../../components/common/Button';
import HeroStockPng from '../../assets/hero-stock.png';
import './Home.css';

export default function Home() {
  return (
    <div className="ef-home-page">
      <div className="container ef-home-container">
        <section className="ef-hero-split">
          {/* Left Column: Value Proposition */}
          <div className="ef-hero-content">
            <div className="ef-hero-pill">
              <Sparkles size={14} />
              <span>Secure AI-Powered Personal Finance Management</span>
            </div>

            <h1 className="ef-hero-title">
              Take complete control of your <span className="ef-hero-accent">financial flow</span>.
            </h1>

            <p className="ef-hero-subtitle">
              Manage your income, expenses, monthly budgets and saving goals with intelligent AI insights and voice entries in one place.
            </p>

            <div className="ef-hero-cta">
              <Link to="/register" id="home-get-started-btn">
                <Button variant="primary" size="lg" icon={ArrowRight}>
                  Get Started
                </Button>
              </Link>
              <Link to="/login" id="home-login-btn">
                <Button variant="outline" size="lg" icon={LogIn}>
                  Login
                </Button>
              </Link>
            </div>

            <ul className="ef-feature-pills">
              <li>
                <Receipt size={15} />
                <span>Expense Tracking</span>
              </li>
              <li>
                <PiggyBank size={15} />
                <span>Smart Budgets</span>
              </li>
              <li>
                <Target size={15} />
                <span>Savings Goals</span>
              </li>
              <li>
                <Bot size={15} />
                <span>Voice Assistant</span>
              </li>
            </ul>
          </div>

          {/* Right Column: Financial Illustration */}
          <div className="ef-hero-graphic-wrap">
            <div className="ef-hero-stock-card">
              <img
                src={HeroStockPng}
                alt="ExpenseFlow Finance Management"
                className="ef-hero-stock-img"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
