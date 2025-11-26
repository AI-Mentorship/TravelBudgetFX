import { useState, useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartOptions, TooltipItem } from 'chart.js'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { getCurrencyForecast, type ForecastData } from '../services/api'
import './FXForecast.css'

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

interface FXForecastProps {
    baseCurrency: string
    targetCurrency: string
    visible: boolean
}

export default function FXForecast({ baseCurrency, targetCurrency, visible }: FXForecastProps) {
    const [data, setData] = useState<ForecastData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const chartRef = useRef(null)

    useEffect(() => {
        if (visible && baseCurrency && targetCurrency) {
            fetchForecast()
        }
    }, [visible, baseCurrency, targetCurrency])

    const fetchForecast = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getCurrencyForecast({
                base_currency: baseCurrency,
                target_currency: targetCurrency,
                days: 30
            })
            setData(result)
        } catch (err) {
            setError('Failed to load forecast data')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const chartData = {
        labels: data.map((d, i) => {
            if (i === 0) return 'Today'
            if (i === 15) return 'Day 15'
            if (i === data.length - 1) return `Day ${i}`
            return ''
        }),
        datasets: [
            {
                label: `${baseCurrency}/${targetCurrency} Exchange Rate`,
                data: data.map(d => d.rate),
                borderColor: '#4facfe',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#4facfe',
                pointBorderColor: 'rgba(255, 255, 255, 0.9)',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#00f2fe',
                pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
                segment: {
                    borderColor: ctx => '#4facfe'
                }
            }
        ]
    }

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    font: { size: 14, weight: '500' },
                    padding: 20
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                titleColor: 'rgba(79, 172, 254, 0.9)',
                bodyColor: 'rgba(255, 255, 255, 0.85)',
                borderColor: 'rgba(79, 172, 254, 0.5)',
                borderWidth: 1,
                padding: 12,
                titleFont: { size: 14, weight: '600' },
                bodyFont: { size: 13, weight: '500' },
                callbacks: {
                    title: (context: TooltipItem<'line'>[]) => {
                        const dataIndex = context[0].dataIndex
                        const date = data[dataIndex]
                        return `Day ${dataIndex}: ${new Date(date.date).toLocaleDateString()}`
                    },
                    label: (context: TooltipItem<'line'>) => {
                        return `Rate: ${context.parsed.y.toFixed(6)}`
                    },
                    afterLabel: (context: TooltipItem<'line'>) => {
                        const dataIndex = context.dataIndex
                        const currentRate = data[0].rate
                        const changePercent = ((data[dataIndex].rate - currentRate) / currentRate) * 100
                        return `Change: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    lineWidth: 0.5
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    font: { size: 12 }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                    lineWidth: 0.5
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    font: { size: 12 },
                    callback: function(value) {
                        return (value as number).toFixed(5)
                    }
                }
            }
        }
    }

    if (!visible) return null

    const rates = data.map(d => d.rate)
    const minRate = rates.length > 0 ? Math.min(...rates) : 0
    const maxRate = rates.length > 0 ? Math.max(...rates) : 0
    const currentRate = rates.length > 0 ? rates[0] : 0
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
    const trend = rates.length > 0 ? ((rates[rates.length - 1] - rates[0]) / rates[0]) * 100 : 0

    const bestRate = Math.max(...rates)
    const bestDayIndex = rates.indexOf(bestRate)
    const bestDay = data[bestDayIndex]

    return (
        <div className="fx-forecast-container">
            <div className="fx-forecast-header">
                <h3>AI Currency Forecast</h3>
                <p>Projected {baseCurrency}/{targetCurrency} exchange rates for the next 30 days</p>
            </div>

            {loading ? (
                <div className="loading-spinner">Generating forecast model...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                    <div className="forecast-stats">
                        <div className="stat-item">
                            <span className="stat-label">Current Rate</span>
                            <span className="stat-value">{currentRate.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">30-Day Trend</span>
                            <span className={`stat-value ${trend >= 0 ? 'positive' : 'negative'}`}>
                                {trend >= 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(2)}%
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Average Rate</span>
                            <span className="stat-value">{avgRate.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Range</span>
                            <span className="stat-value">{minRate.toFixed(4)} - {maxRate.toFixed(4)}</span>
                        </div>
                    </div>

                    <div className="chart-wrapper">
                        <Line ref={chartRef} data={chartData} options={chartOptions} />
                    </div>

                    {bestDay && (
                        <div className="recommendation-card">
                            <div className="recommendation-icon">💡</div>
                            <div className="recommendation-content">
                                <h4>Smart Recommendation</h4>
                                <p>
                                    Based on our AI model, the best time to exchange your money is on{' '}
                                    <span className="highlight-rate">{new Date(bestDay.date).toLocaleDateString()}</span>{' '}
                                    when the rate is projected to be <span className="highlight-rate">{bestDay.rate.toFixed(4)}</span>.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
