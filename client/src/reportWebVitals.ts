// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reportWebVitals = (onPerfEntry?: any) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((vitals) => {
      if (vitals.onCLS) vitals.onCLS(onPerfEntry);
      if (vitals.onFID) vitals.onFID(onPerfEntry);
      if (vitals.onFCP) vitals.onFCP(onPerfEntry);
      if (vitals.onLCP) vitals.onLCP(onPerfEntry);
      if (vitals.onTTFB) vitals.onTTFB(onPerfEntry);
    }).catch(() => {
      // Ignore web-vitals errors
    });
  }
};

export default reportWebVitals;
