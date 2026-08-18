export default class BillingInterval {
    constructor(private readonly interval: string) {}

    advance(date: Date, count: number): Date {
        const result = new Date(date);

        if (this.interval === 'monthly') {
            result.setMonth(date.getMonth() + count);
            return result;
        }

        if (this.interval === 'yearly') {
            let monthPerYear = 12;
            result.setMonth(date.getMonth() + count * monthPerYear);
            return result;
        }

        if (this.interval === 'weekly') {
            let daysPerWeek = 7;
            result.setDate(date.getDate() + count * daysPerWeek);
            return result;
        }

        return result;
    }
}
