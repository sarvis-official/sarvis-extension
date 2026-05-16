export class Analytics {
    static track(
        event: string,
        payload?: Record<
            string,
            unknown
        >
    ) {
        console.log(
            "[Analytics]",
            event,
            payload || {}
        );
    }
}