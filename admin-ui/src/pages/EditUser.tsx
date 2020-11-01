import React from 'react';
import FullLayout from '../components/FullLayout';
import { Form, Col, Row, Button, Alert, InputGroup } from 'react-bootstrap';
import { ChevronLeft as IconBack, Save as IconSave, Trash2 as IconDelete } from 'react-feather';
import { Link, RouteChildrenProps, Redirect } from 'react-router-dom';
import Loading from '../components/Loading';
import { User, Settings as OrgSettings, Domain } from 'flexspace-commons';

interface State {
  loading: boolean
  submitting: boolean
  saved: boolean
  error: boolean
  goBack: boolean
  email: string
  requirePassword: boolean
  password: string
  changePassword: boolean
  admin: boolean
  domain: string
}

interface Props {
  id: string
}

export default class EditUser extends React.Component<RouteChildrenProps<Props>, State> {
  entity: User = new User();
  usersMax: number = 0;
  usersCur: number = -1;
  domains: Domain[] = [];

  constructor(props: any) {
    super(props);
    this.state = {
      loading: true,
      submitting: false,
      saved: false,
      error: false,
      goBack: false,
      email: "",
      requirePassword: false,
      password: "",
      changePassword: false,
      admin: false,
      domain: ""
    };
  }

  componentDidMount = () => {
    this.loadData();
  }

  loadData = () => {
    let promises: Promise<any>[] = [
      OrgSettings.getOne("subscription_max_users"),
      User.getCount(),
      User.getSelf().then(me => {
        return Domain.list(me.organizationId);
      })
    ];
    if (this.props.match?.params.id) {
      promises.push(User.get(this.props.match.params.id));
    }
    Promise.all(promises).then(values => {
      this.usersMax = window.parseInt(values[0]);
      this.usersCur = values[1];
      this.domains = values[2];
      let selectedDomain = "";
      this.domains.forEach(domain => {
        if (!selectedDomain && domain.active) {
          selectedDomain = domain.domain;
        }
      });
      this.setState({
        domain: selectedDomain
      });
      if (values.length >= 4) {
        let user = values[3];
        let userDomain = user.email.substring(user.email.indexOf("@")+1).toLowerCase();
        this.entity = user;
        this.setState({
          email: user.email.substring(0, user.email.indexOf("@")),
          requirePassword: user.requirePassword,
          admin: user.admin,
          domain: userDomain
        });
      }
      this.setState({
        loading: false
      });
    });
  }

  onSubmit = (e: any) => {
    e.preventDefault();
    this.setState({
      error: false,
      saved: false
    });
    this.entity.email = this.state.email + "@" + this.state.domain;
    this.entity.admin = this.state.admin;
    this.entity.save().then(() => {
      this.props.history.push("/users/" + this.entity.id);
      if (this.state.changePassword) {
        this.entity.setPassword(this.state.password).then(() => {
          this.setState({ saved: true });
        }).catch(() => {
          this.setState({ error: true });
        });
      } else {
        this.setState({ saved: true });
      }
    }).catch(() => {
      this.setState({ error: true });
    });
  }

  deleteItem = () => {
    if (window.confirm("Benutzer löschen?")) {
      this.entity.delete().then(() => {
        this.setState({ goBack: true });
      });
    }
  }

  render() {
    if (this.state.goBack) {
      return <Redirect to={`/users`} />
    }

    let backButton = <Link to="/users" className="btn btn-sm btn-outline-secondary"><IconBack className="feather" /> Zurück</Link>;
    let buttons = backButton;

    if (this.state.loading) {
      return (
        <FullLayout headline="Benutzer bearbeiten" buttons={buttons}>
          <Loading />
        </FullLayout>
      );
    }

    if (this.usersCur >= this.usersMax && !this.entity.id) {
      return (
        <FullLayout headline="Benutzer bearbeiten" buttons={buttons}>
          <p>Sie haben die maximale Anzahl von Benutzern erreicht.</p>
          <Link to="/settings" className="btn btn-primary">Abonnement verwalten</Link>
        </FullLayout>
      );
    }

    let hint = <></>;
    if (this.state.saved) {
      hint = <Alert variant="success">Eintrag wurde aktualisiert.</Alert>
    } else if (this.state.error) {
      hint = <Alert variant="danger">Fehler beim Speichern, bitte kontrollieren Sie die Angaben.</Alert>
    }

    let domainOptions = this.domains.map(domain => {
      return <option key={domain.domain} value={domain.domain} disabled={!domain.active}>@{domain.domain.toLowerCase()}</option>;
    });

    let buttonDelete = <Button className="btn-sm" variant="outline-secondary" onClick={this.deleteItem} disabled={false}><IconDelete className="feather" /> Löschen</Button>;
    let buttonSave = <Button className="btn-sm" variant="outline-secondary" type="submit" form="form"><IconSave className="feather" /> Speichern</Button>;
    if (this.entity.id) {
      buttons = <>{backButton} {buttonDelete} {buttonSave}</>;
    } else {
      buttons = <>{backButton} {buttonSave}</>;
    }
    let changePasswordLabel = "Login mit Kennwort";
    if (this.entity.id) {
      changePasswordLabel = "Kennwort ändern";
    }
    let changePassword = (
      <Form.Group as={Row}>
        <Col sm="6">
          <Form.Check type="checkbox" id="check-changePassword" label={changePasswordLabel} checked={this.state.changePassword} onChange={(e: any) => this.setState({ changePassword: e.target.checked })} />
        </Col>
      </Form.Group>
    );
    return (
      <FullLayout headline="Benutzer bearbeiten" buttons={buttons}>
        <Form onSubmit={this.onSubmit} id="form">
          {hint}
          <Form.Group as={Row}>
            <Form.Label column sm="2">E-Mail</Form.Label>
            <Col sm="4">
              <InputGroup>
                <Form.Control type="text" placeholder="max.mustermann" value={this.state.email} onChange={(e: any) => this.setState({ email: e.target.value })} required={true} />
                <InputGroup.Append>
                  <Form.Control as="select" className="custom-select" value={this.state.domain} onChange={(e: any) => this.setState({ domain: e.target.value })}>
                    {domainOptions}
                  </Form.Control>
                </InputGroup.Append>
              </InputGroup>
            </Col>
          </Form.Group>
          {changePassword}
          <Form.Group as={Row}>
            <Form.Label column sm="2">Kennwort</Form.Label>
            <Col sm="4">
              <Form.Control type="password" value={this.state.password} onChange={(e: any) => this.setState({ password: e.target.value })} required={!this.entity.id || this.state.changePassword} disabled={!this.state.changePassword} />
            </Col>
          </Form.Group>
          <Form.Group as={Row}>
            <Col sm="6">
              <Form.Check type="checkbox" id="check-admin" label="Administrator" checked={this.state.admin} onChange={(e: any) => this.setState({ admin: e.target.checked })} />
            </Col>
          </Form.Group>
        </Form>
      </FullLayout>
    );
  }
}
