import { ServerRespond } from './DataStreamer';

export interface Row {
  price_abc: number,
  price_def: number,
  ratio: number,
  timestamp: Date,
  upper_bound: number,
  lower_bound: number,
  trigger_alert: number | undefined,
  moving_average: number,
  signal: 'BUY' | 'SELL' | 'HOLD' | undefined,
}

export class DataManipulator {
  private static readonly MOVING_AVERAGE_WINDOW = 10; // Number of data points for moving average
  private static readonly THRESHOLD = 0.05; // 5% threshold for upper and lower bounds
  private static movingAverageQueue: number[] = [];

  /**
   * Generates a row of processed data from server responses.
   * @param serverResponds - Array of server responses containing stock data
   * @returns Processed row of data with calculated metrics and signals
   */
static generateRow(serverResponds: ServerRespond[]): Row {
  const priceABC = this.calculateMidPrice(serverResponds[0]);
  const priceDEF = this.calculateMidPrice(serverResponds[1]);
  const ratio = priceABC / priceDEF;
  const movingAverage = this.updateMovingAverage(ratio);
  const upperBound = 1 + this.THRESHOLD;
  const lowerBound = 1 - this.THRESHOLD;
  const signal = this.generateSignal(ratio, movingAverage, upperBound, lowerBound);

  console.log(`Generated Signal: ${signal}`); // Log signal

  return {
    price_abc: priceABC,
    price_def: priceDEF,
    ratio,
    timestamp: this.getLatestTimestamp(serverResponds),
    upper_bound: upperBound,
    lower_bound: lowerBound,
    trigger_alert: (ratio > upperBound || ratio < lowerBound) ? ratio : undefined,
    moving_average: movingAverage,
    signal: signal,
  };
}


  /**
   * Calculates the mid-price from top ask and bid prices.
   * @param data - Server response for a single stock
   * @returns Mid-price of the stock
   */
  private static calculateMidPrice(data: ServerRespond): number {
    return (data.top_ask.price + data.top_bid.price) / 2;
  }

  /**
   * Gets the latest timestamp from server responses.
   * @param serverResponds - Array of server responses
   * @returns The most recent timestamp
   */
  private static getLatestTimestamp(serverResponds: ServerRespond[]): Date {
    return serverResponds[0].timestamp > serverResponds[1].timestamp
      ? serverResponds[0].timestamp : serverResponds[1].timestamp;
  }

  /**
   * Updates and calculates the moving average of the ratio.
   * @param ratio - Current ratio value
   * @returns Updated moving average
   */
  private static updateMovingAverage(ratio: number): number {
    this.movingAverageQueue.push(ratio);
    if (this.movingAverageQueue.length > this.MOVING_AVERAGE_WINDOW) {
      this.movingAverageQueue.shift();
    }
    return this.movingAverageQueue.reduce((a, b) => a + b) / this.movingAverageQueue.length;
  }

  /**
   * Generates a trading signal based on the current ratio and moving average.
   * @param ratio - Current ratio value
   * @param movingAverage - Current moving average
   * @param upperBound - Upper threshold for generating alerts
   * @param lowerBound - Lower threshold for generating alerts
   * @returns Trading signal: 'BUY', 'SELL', or 'HOLD'
   */
  private static generateSignal(ratio: number, movingAverage: number, upperBound: number, lowerBound: number): 'BUY' | 'SELL' | 'HOLD' | undefined {
    if (ratio > upperBound && ratio > movingAverage) {
      return 'SELL';
    } else if (ratio < lowerBound && ratio < movingAverage) {
      return 'BUY';
    } else if (ratio > upperBound || ratio < lowerBound) {
      return 'HOLD';
    }
    return undefined;
  }
}