import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from 'components/primitives/button';
import ServerCollection from 'components/ServerCollection';
import userService from 'services/api/userService';
import './styles.scss';

class User extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className='profileContents'>
        <div className='row headerRow'>
          <h2 className='headerLabel'>User Profile:</h2>
          <Button
            onClick={ userService.signOut.bind(userService) }
            className='formButton'
          >
            Sign Out
          </Button>
          <Button
            onClick={ this.props.onClose }
            className='formButton'
          >
            Close
          </Button>
        </div>
        <ServerCollection
          className='puppetCollection'
          openLoader={ this.props.openLoader }
          closeLoader={ this.props.closeLoader }
          />
      </div>
    );
  }
}

User.propTypes = {
  onClose: PropTypes.func.isRequired,
  openLoader: PropTypes.func.isRequired,
  closeLoader: PropTypes.func.isRequired
};

export default User;
