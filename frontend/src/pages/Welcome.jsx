import React from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="welcome">
      <h1>Welcome to the Aikido Dojo Timeline</h1>
      <p>
        This project is putting together a timeline of Aikido dojos and the practitioners
        who trained in them, around the world and across the years. Help build it by adding
        yourself and your dojo.
      </p>
      <div className="toolbar">
        <Link className="btn" to="/practitioners/new">Add yourself</Link>
        <Link className="btn" to="/dojos/new">Add your dojo</Link>
      </div>
      <p>
        Or just browse: <Link to="/dojos">dojos</Link> · <Link to="/practitioners">practitioners</Link>
      </p>
    </div>
  );
}
