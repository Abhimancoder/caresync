import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function AdherenceLineChart({ trendData = [] }) {
  const labels = trendData.map(item => item.label);
  const dataPoints = trendData.map(item => item.adherenceRate !== null ? item.adherenceRate : 100);

  const data = {
    labels,
    datasets: [
      {
        label: 'Adherence Rate (%)',
        data: dataPoints,
        borderColor: '#0D9488', // CareSync Teal
        backgroundColor: 'rgba(13, 148, 136, 0.12)',
        borderWidth: 3,
        pointBackgroundColor: '#1E3A8A',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `Adherence: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
          stepSize: 20,
          font: { size: 11 },
          color: '#64748B',
        },
        grid: {
          color: '#E2E8F0',
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
          color: '#64748B',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="h-64 sm:h-72 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function AdherenceDoughnutChart({ metrics }) {
  const taken = metrics?.totalTaken || 0;
  const missed = metrics?.totalMissed || 0;
  const skipped = metrics?.totalSkipped || 0;

  const data = {
    labels: ['Taken Doses', 'Missed Doses', 'Clinically Skipped'],
    datasets: [
      {
        data: [taken, missed, skipped],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 16,
          font: { size: 12, weight: '600' },
          color: '#334155',
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        padding: 10,
        cornerRadius: 8,
      },
    },
    cutout: '70%',
  };

  return (
    <div className="h-64 sm:h-72 w-full flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
}

export default {
  AdherenceLineChart,
  AdherenceDoughnutChart,
};
