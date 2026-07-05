/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { StartupProfile } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, Flame, Hourglass, Activity, CheckCircle, TrendingUp, Cpu, Award } from 'lucide-react';

interface MetricCardsProps {
  startup: StartupProfile;
}

export default function MetricCards({ startup }: MetricCardsProps) {
  const { cashBalance, burnRate, runwayMonths, healthScore, metrics } = startup;

  // Format currencies
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Generate 12-month treasury runway projection chart data
  const chartData = useMemo(() => {
    const data = [];
    let tempCash = cashBalance;
    const date = new Date();
    
    for (let i = 0; i < 12; i++) {
      const monthLabel = date.toLocaleString('default', { month: 'short' });
      data.push({
        name: monthLabel,
        'Treasury Balance': Math.round(tempCash),
      });
      tempCash = Math.max(0, tempCash - burnRate);
      date.setMonth(date.getMonth() + 1);
    }
    return data;
  }, [cashBalance, burnRate]);

  // Determine health color theme
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'border-[#141413]/10 bg-white text-emerald-700';
    if (score >= 60) return 'border-[#141413]/10 bg-white text-indigo-700';
    return 'border-[#141413]/10 bg-white text-amber-700';
  };

  return (
    <div id="metric-cards-container" className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Treasury */}
        <div id="metric-card-treasury" className="p-5 rounded-[20px] border border-[#141413]/10 bg-white relative overflow-hidden transition-all hover:border-[#141413]/30 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#696969]">Cash Reserves</span>
            <div className="p-2 rounded-lg bg-[#141413]/05 text-[#141413]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-[#141413] font-mono">
              {formatCurrency(cashBalance)}
            </h3>
            <p className="mt-1 text-xs text-[#696969] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Accredited Bank Treasury
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 opacity-20" />
        </div>

        {/* Burn Rate */}
        <div id="metric-card-burn" className="p-5 rounded-[20px] border border-[#141413]/10 bg-white relative overflow-hidden transition-all hover:border-[#141413]/30 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#696969]">Monthly Burn Rate</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-700">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-[#141413] font-mono">
              {formatCurrency(burnRate)}
            </h3>
            <p className="mt-1 text-xs text-[#696969]">
              Including operating expenditures
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-600 opacity-20" />
        </div>

        {/* Runway */}
        <div id="metric-card-runway" className="p-5 rounded-[20px] border border-[#141413]/10 bg-white relative overflow-hidden transition-all hover:border-[#141413]/30 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#696969]">Active Runway</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-[#141413] font-mono">
              {runwayMonths} <span className="text-lg font-sans text-[#696969] font-normal">Months</span>
            </h3>
            <p className="mt-1 text-xs text-[#696969]">
              Until next strategic round is required
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-600 opacity-20" />
        </div>

        {/* Health Score */}
        <div id="metric-card-health" className={`p-5 rounded-[20px] border relative overflow-hidden transition-all hover:border-[#141413]/30 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] ${getHealthColor(healthScore)}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#696969]">SaaS Health Index</span>
            <div className="p-2 rounded-lg bg-[#22C55E]/10 text-emerald-700">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-[#141413] font-mono">
              {healthScore} <span className="text-lg font-sans text-[#696969] font-normal">/100</span>
            </h3>
            <p className="mt-1 text-xs text-[#696969]">
              Average weighted operational capacity
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 opacity-30" />
        </div>

      </div>

      {/* Main Core Charts & Metrics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Treasury Projections Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-[20px] border border-[#141413]/10 bg-white flex flex-col justify-between shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#141413]">Treasury Cash Projections</h4>
                <p className="text-xs text-[#696969] mt-1">12-month simulation forecasting asset depletion based on active burn rate</p>
              </div>
              <span className="px-2.5 py-1 text-xs rounded-full bg-[#F3F0EE] border border-[#141413]/10 text-[#141413] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Modeling
              </span>
            </div>
            
            <div className="h-64 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#141413" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#141413" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#696969" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#696969" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(tick) => `$${tick / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#FCFBFA', borderColor: 'rgba(20,20,19,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#696969', fontWeight: 'bold' }}
                    itemStyle={{ color: '#141413' }}
                    formatter={(value) => [`${formatCurrency(value as number)}`, 'Treasury Balance']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Treasury Balance" 
                    stroke="#141413" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCash)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Core Multi-Functional Metrics */}
        <div className="p-6 rounded-[20px] border border-[#141413]/10 bg-white flex flex-col justify-between shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div>
            <h4 className="text-base font-semibold text-[#141413]">Executive Metrics Breakdown</h4>
            <p className="text-xs text-[#696969] mt-1">Autonomous operations rating tracked by departmental executives</p>
            
            <div className="mt-5 space-y-4">
              {/* Product Velocity */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#696969] font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#141413]" />
                    Engineering Velocity
                  </span>
                  <span className="font-mono text-[#141413] font-semibold">{metrics.velocity}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#141413] rounded-full transition-all duration-500" style={{ width: `${metrics.velocity}%` }} />
                </div>
              </div>

              {/* Financial Health */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#696969] font-medium flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Capital Efficiency
                  </span>
                  <span className="font-mono text-[#141413] font-semibold">{metrics.financialHealth}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${metrics.financialHealth}%` }} />
                </div>
              </div>

              {/* Legal Compliance */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#696969] font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-rose-500" />
                    Legal Compliance
                  </span>
                  <span className="font-mono text-[#141413] font-semibold">{metrics.legalCompliance}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600 rounded-full transition-all duration-500" style={{ width: `${metrics.legalCompliance}%` }} />
                </div>
              </div>

              {/* Growth Rate */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#696969] font-medium flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Pipeline Growth
                  </span>
                  <span className="font-mono text-[#141413] font-semibold">{metrics.growthRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full transition-all duration-500" style={{ width: `${metrics.growthRate}%` }} />
                </div>
              </div>

              {/* Operations Efficiency */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#696969] font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sky-500" />
                    Operations Efficiency
                  </span>
                  <span className="font-mono text-[#141413] font-semibold">{metrics.operationsEfficiency}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-sky-600 rounded-full transition-all duration-500" style={{ width: `${metrics.operationsEfficiency}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-[#141413]/10 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#696969]">Autonomous Governance Active</span>
          </div>
        </div>

      </div>
    </div>
  );
}
