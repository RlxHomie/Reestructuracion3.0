export const EventManager = (() => {
    const events = {};
    function subscribe(eventName, listener) {
        if (!events[eventName]) events[eventName] = [];
        events[eventName].push(listener);
    }
    function unsubscribe(eventName, listener) {
        if (!events[eventName]) return;
        events[eventName] = events[eventName].filter(l => l !== listener);
    }
    function publish(eventName, data) {
        if (!events[eventName]) return;
        events[eventName].forEach(listener => {
            try { listener(data); } catch (error) { console.error(`Error in listener for ${eventName}:`, error); }
        });
    }
    return { subscribe, unsubscribe, publish };
})();
