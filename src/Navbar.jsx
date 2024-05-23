import PropTypes from 'prop-types'

Navbar.propTypes = {
  token: PropTypes.string,
  login: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
}

function Navbar({ token, login, logout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Spotify React</h1>
      </div>
      <div className="navbar-buttons">
        {!token ? (
          <button onClick={login}>Login to Spotify</button>
        ) : (
          <button onClick={logout}>Logout</button>
        )}
      </div>
    </nav>
  )
}

export default Navbar
