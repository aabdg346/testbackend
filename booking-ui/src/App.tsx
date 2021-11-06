import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import './i18n';
import './App.css';
import { withTranslation } from 'react-i18next';
import { Ajax, AjaxCredentials, Settings as OrgSettings, User } from 'flexspace-commons';
import Login from './pages/Login';
import LoginSuccess from './pages/LoginSuccess';
import LoginFailed from './pages/LoginFailed';
import ProtectedRoute from './pages/ProtectedRoute';
import Search from './pages/Search';
import Bookings from './pages/Bookings';
import ConfluenceHint from './pages/ConfluenceHint';
import RuntimeConfig from './components/RuntimeConfig';
import { AuthContext, AuthContextData } from './AuthContextData';
import Loading from './components/Loading';
import ConfluenceAnonymous from './pages/ConfluenceAnonymous';
import CompletePasswordReset from './pages/CompletePasswordReset';
import InitPasswordReset from './pages/InitPasswordReset';

interface Props {
}

class App extends React.Component<Props, AuthContextData> {
  constructor(props: Props) {
    super(props);
    this.state = {
      username: "",
      isLoading: true,
      maxBookingsPerUser: 0,
      maxDaysInAdvance: 0,
      maxBookingDurationHours: 0,
      dailyBasisBooking: false,
      showNames: false,
      defaultTimezone: "",
      setDetails: this.setDetails
    };
    if (process.env.NODE_ENV.toLowerCase() === "development") {
      Ajax.URL = "http://" + window.location.host.split(':').shift() + ":8080";
    }
    if (window.location.href.indexOf(".loca.lt/") > -1) {
      Ajax.URL = "https://" + window.location.host.split(':').shift();
    }
    setTimeout(() => {
      this.verifyToken();
    }, 10);
  }
  
  verifyToken = async () => {
    Ajax.CREDENTIALS = await Ajax.PERSISTER.readCredentialsFromSessionStorage();
    if (!Ajax.CREDENTIALS.accessToken) {
      Ajax.CREDENTIALS = await Ajax.PERSISTER.readRefreshTokenFromLocalStorage();
      if (Ajax.CREDENTIALS.refreshToken) {
        await Ajax.refreshAccessToken(Ajax.CREDENTIALS.refreshToken);
      }
    }
    if (Ajax.CREDENTIALS.accessToken) {
      User.getSelf().then(user => {
        this.loadSettings().then(() => {
          this.setDetails(user.email);
          this.setState({ isLoading: false });
        });
      }).catch((e) => {
        Ajax.CREDENTIALS = new AjaxCredentials();
        Ajax.PERSISTER.deleteCredentialsFromSessionStorage().then(() => {
          this.setState({ isLoading: false });
        });
      });
    } else {
      this.setState({ isLoading: false });
    }
  }

  loadSettings = async () => {
    OrgSettings.list().then(settings => {
      let state: any = {};
      settings.forEach(s => {
        if (s.name === "max_bookings_per_user") state.maxBookingsPerUser = window.parseInt(s.value);
        if (s.name === "max_days_in_advance") state.maxDaysInAdvance = window.parseInt(s.value);
        if (s.name === "max_booking_duration_hours") state.maxBookingDurationHours = window.parseInt(s.value);
        if (s.name === "daily_basis_booking") state.dailyBasisBooking = (s.value === "1");
        if (s.name === "show_names") state.showNames = (s.value === "1");
        if (s.name === "default_timezone") state.defaultTimezone = s.value;
      });
      this.setState({
        ...this.state,
        ...state
      });
    });
  }

  setDetails = (username: string) => {
    this.loadSettings().then(() => {
      this.setState({
        username: username
      });
    });
  }

  render() {
    if (window !== window.parent) {
      // Add Confluence JS
      if (!document.getElementById("confluence-js")) {
        const script = document.createElement("script");
        script.id = "confluence-js";
        script.src = "https://connect-cdn.atl-paas.net/all.js";
        document.head.appendChild(script);
      }
      RuntimeConfig.EMBEDDED = true;
    }

    if (this.state.isLoading) {
      return <Loading />;
    }

    return (
      <Router basename={process.env.PUBLIC_URL}>
        <AuthContext.Provider value={this.state}>
          <Switch>
            <Route path="/login/confluence/anonymous" component={ConfluenceAnonymous} />
            <Route path="/login/confluence/:id" component={ConfluenceHint} />
            <Route path="/login/success/:id" component={LoginSuccess} />
            <Route path="/login/failed" component={LoginFailed} />
            <Route path="/login" component={Login} />
            <Route path="/resetpw/:id" component={CompletePasswordReset} />
            <Route path="/resetpw" component={InitPasswordReset} />
            <ProtectedRoute path="/search" component={Search} />
            <ProtectedRoute path="/bookings" component={Bookings} />
            <Route path="/"><Redirect to="/login" /></Route>
          </Switch>
        </AuthContext.Provider>
      </Router>
    );
  }
}

export default withTranslation()(App as any);
