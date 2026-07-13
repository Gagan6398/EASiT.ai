import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true, // Automatically captures clicks, pageviews, etc.
        capture_pageview: false // We will handle this manually in React Router if needed, or let autocapture do it
    });
} else {
    console.warn("PostHog Key is missing. Analytics are disabled.");
}

export default posthog;
