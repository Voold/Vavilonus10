import styles from '../../styles/ui/Logo.module.css'

export const Logo: React.FC = () => (
    <div className = {styles.background}>
      <svg viewBox="0 0 52.1006 54.2017" xmlns="http://www.w3.org/2000/svg"  fill="none">
        <path d="M15.2329 2.21532e-06L0 0L24.505 53.9802L37.9718 8.4393e-06L34.8811 2.74277e-06L25.8297 27.8751L15.2329 2.21532e-06Z" fill="rgb(255,255,255)" fill-rule="evenodd" />
        <path d="M39.7378 1.03381e-05L52.1007 0L26.0503 54.2017L39.7378 1.03381e-05Z" fill="rgb(255,0,0)" fill-rule="evenodd" />
      </svg>
    </div>
);