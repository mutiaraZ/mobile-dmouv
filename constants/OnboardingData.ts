// Import SVG sebagai komponen React
import WelcomeDua from "../assets/images/welcomedua.svg";
import WelcomeEmpat from "../assets/images/welcomeempat.svg";
import WelcomeSatu from "../assets/images/welcomesatu.svg";
import WelcomeTiga from "../assets/images/welcometiga.svg";

const OnboardingData = [
  {
    id: "1",
    title: "Welcome to Dmouv",
    subtitle: '"A smart solution for your space"',
    image: WelcomeSatu,
  },
  {
    id: "2",
    title: "Automatic Control",
    subtitle:
      "All devices will turn on when you arrive and switch off when you leave",
    image: WelcomeDua,
  },
  {
    id: "3",
    title: "Real-time Dashboard",
    subtitle: "Stay in control with live updates and smart analytics",
    image: WelcomeTiga,
  },
  {
    id: "4",
    title: "Let's Get Started",
    subtitle: "Log in or sign up to connect and take control of your devices",
    image: WelcomeEmpat,
  },
];

export default OnboardingData;