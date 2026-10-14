import { VercelBadge } from './vercel-badge';

/** What someone needs before deploying. Shown on the landing finale and the setup page. */
export function Requirements({ title }: { title: string }) {
  return (
    <div className="needs">
      <h3 className="needs-title">{title}</h3>
      <ul>
        <li>
          <strong>
            A <VercelBadge kind="vercel" /> account
          </strong>
          <span>Free to sign up. Your copy of this project and your credits live there.</span>
        </li>
        <li>
          <strong>A GitHub, GitLab or Bitbucket account</strong>
          <span>The Deploy button copies the code into it for you.</span>
        </li>
        <li>
          <strong>
            <VercelBadge kind="gateway" /> credits
          </strong>
          <span>Free monthly credits cover a set of models. Top up to use the rest.</span>
        </li>
      </ul>
    </div>
  );
}
