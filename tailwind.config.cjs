module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        base: {
          background: "#050511",
          panel: "#111120"
        },
        brand: {
          primary: "#8A7CFF",
          secondary: "#E28FE8"
        },
        text: {
          primary: "#F5F5FA",
          secondary: "#A4A4B5"
        },
        hp: "#FF5A78",
        posture: "#7A8CFF",
        energy: "#2DE3C8",
        crit: "#FFD344"
      },
      borderRadius: {
        smooth: "12px"
      },
      boxShadow: {
        neon: "0 0 24px rgba(138, 124, 255, 0.25)"
      }
    }
  },
  plugins: []
};
