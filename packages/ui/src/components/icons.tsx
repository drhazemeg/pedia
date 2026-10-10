import {
  AlertCircle,
  AlertTriangle,
  Archive,
  AreaChart,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BabyIcon,
  BadgeCheck,
  Bell,
  Bold,
  BookOpen,
  Box,
  Briefcase,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CirclePlus,
  CircleX,
  ClipboardList,
  ClipboardX,
  Clock,
  Code,
  Command,
  Copy,
  CornerUpLeft,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  EyeOff,
  File,
  FileJson,
  FileText,
  FlaskRoundIcon,
  Folder,
  Globe,
  GripVertical,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Info,
  Italic,
  Kanban,
  Laptop,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  Minus,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Music,
  Palette,
  PanelLeft,
  Paperclip,
  Pencil,
  Phone,
  Pizza,
  Plus,
  Search,
  Send,
  Settings,
  Share,
  Shield,
  Slash,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  SunMedium,
  Syringe,
  Trash2,
  TrendingDown,
  TrendingUp,
  Type,
  Underline,
  Upload,
  User,
  UserCircle,
  UserCog,
  UserMinus,
  Users,
  Video,
  X,
} from "lucide-react";
import type * as React from "react";
import { useId } from "react";

type IconProps = React.HTMLAttributes<SVGElement>;

const iconStyles =
  "text-muted-foreground hover:text-foreground transition-colors duration-300";

export type Icon = React.ComponentType<IconProps>;

export const Icons = {
  archive: Archive,
  star: Star,
  google: function GoogleIcon(props: IconProps) {
    const iconId = useId();
    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Google</title>
        <path
          d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.6 3.6 1.8 7.4l3.7 2.9C6.4 7.3 9 5 12 5z"
          fill="#EA4335"
        />
        <path
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          fill="#4285F4"
        />
        <path
          d="M5.5 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.8 6.4C.7 8.6 0 11.2 0 14s.7 5.4 1.8 7.6l3.7-2.9z"
          fill="#FBBC05"
        />
        <path
          d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.6-2.3-6.5-5.3L1.8 16c1.8 3.8 5.6 7 10.2 7z"
          fill="#34A853"
        />
      </svg>
    );
  },
  Apple: (props: React.ComponentProps<"svg">) => (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <title>Apple</title>
      <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      <path d="M6 8v2a10 10 0 0 0 12 0V8" />
      <path d="M5 10v6a5 5 0 0 0 4 4.9" />
      <path d="M19 10v6a5 5 0 0 1-4 4.9" />
    </svg>
  ),
  arrowDown: ArrowDown,
  caretSort: ChevronsUpDown,
  arrowUp: ArrowUp,
  baby: BabyIcon,
  ThermometerIcon: function ThermometerIcon(props: IconProps) {
    const iconId = useId();
    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Thermometer</title>
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
        <path d="M12 12v5" />
      </svg>
    );
  },
  discord: function DiscordIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        viewBox="0 0 126.644 96"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Discord</title>
        <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505Z" />
      </svg>
    );
  },

  quote: function QuoteIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Quote</title>
        <path d="M7 8h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 4V10a2 2 0 0 1 2-2Z" />
        <path d="M8 12h2v2H8Z" />
        <path d="M14 12h2v2h-2Z" />
      </svg>
    );
  },

  loader: Loader2,
  RiMoreLine: MoreHorizontal,
  accessibility: function AccessibilityIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Accessibility</title>
        <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1.5 9h3v5h-3v-5Zm6.364-3.364 2.121 2.121-1.414 1.414-2.121-2.121L16.95 8.636ZM5.636 8.636l2.121 2.121L6.121 12.172 4 10.05l2.121-2.121Z" />
      </svg>
    );
  },

  building: function BuildingIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Building</title>
        <path d="M3 21h18v-2a2 2 0 0 0-2-2h-14a2 2 0 0 0-2 2v2Zm16-10V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6m8-4h.01M12 9h.01M12 13h.01M8 9h.01M8 13h.01M16 9h.01M16 13h.01" />
      </svg>
    );
  },
  heart: function HeartIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Heart</title>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  },
  refresh: Loader2,
  database: function DatabaseIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Database</title>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3M3 7c0 1.66 4.03 3 9 3s9-1.34 9-3M3 17c0 1.66 4.03 3 9 3s9-1.34 9-3" />
      </svg>
    );
  },
  undo: CornerUpLeft,
  copy: Copy,
  calculator: function CalculatorIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Calculator</title>
        <rect height="18" rx="2" width="14" x="5" y="3" />
        <line x1="9" x2="15" y1="7" y2="7" />
        <line x1="9" x2="9" y1="11" y2="11" />
        <line x1="13" x2="13" y1="11" y2="11" />
        <line x1="9" x2="9" y1="15" y2="15" />
        <line x1="13" x2="13" y1="15" y2="15" />
      </svg>
    );
  },
  folder: Folder,
  alertTriangle: AlertTriangle,
  instagram: function InstagramIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Instagram</title>
        <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  },
  stethoscope: function StethoscopeIcon(props: IconProps) {
    const iconId = useId();
    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Stethiscope</title>

        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    );
  },
  github: function GitHubIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>GitHub</title>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.236-3.22-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.984-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.29-1.552 3.296-1.23 3.296-1.23.655 1.653.243 2.873.12 3.176.77.84 1.234 1.91 1.234 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0z" />
      </svg>
    );
  },
  shield: Shield,
  bell: Bell,
  activity: AreaChart,

  fileText: FileText,
  clipboardList: ClipboardList,
  dollarSign: DollarSign,
  twitter: function TwitterIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Twitter (X)</title>
        <path d="M18.244 2H21l-6.52 7.455L22 22h-6.172l-4.833-6.307L5.47 22H2.714l6.976-7.97L2 2h6.328l4.37 5.684L18.244 2Zm-1.082 18h1.72L7.43 3.93H5.59l11.572 16.07Z" />
      </svg>
    );
  },

  facebook: function FacebookIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>Facebook</title>
        <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692V11.01h3.128V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.464.099 2.796.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.763v2.312h3.587l-.467 3.696h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
      </svg>
    );
  },

  youtube: function YouTubeIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>YouTube</title>
        <path d="M23.498 6.186a2.996 2.996 0 0 0-2.112-2.12C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.386.521a2.996 2.996 0 0 0-2.112 2.12C0 8.07 0 12 0 12s0 3.93.502 5.814a2.996 2.996 0 0 0 2.112 2.12c1.881.521 9.386.521 9.386.521s7.505 0 9.386-.521a2.996 2.996 0 0 0 2.112-2.12C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
      </svg>
    );
  },
  linkedin: function LinkedInIcon(props: IconProps) {
    const iconId = useId();

    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>LinkedIn</title>
        <path d="M18.997 0H5.003C2.242 0 0 2.243 0 5.005v13.99C0 21.759 2.243 24 5.005 24h13.99C21.759 24 24 21.759 24 18.995V5.005C24 2.243 21.759 0 18.997 0zM8.722 18.997H6.404V10.57H8.72V18.997zM7.563 9.365c-1.123 0-2.035-.912-2.035-2.035 0-1.123.912-2.035 2.035-2.035 1.123 0 2.035.912 2.035 2.035 0 1.124-.912 2.035-2.035 2.035zm10.084 9.632H15.106V14.9c0-1.214-.044-2.764-1.704-2.764-1.706 0-1.955 1.338-1.955 2.666v4.227H11.2V10.57h2.22v1.029c.311-.593 1.073-1.232 2.244-1.232 2.406 0 2.852 1.578 2.852 3.627v5.145z" />
      </svg>
    );
  },
  MapPinIcon: function MapPinIcon(props: IconProps) {
    const iconId = useId();
    return (
      <svg
        aria-labelledby={iconId}
        className={iconStyles}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <title id={iconId}>MapPinIcon</title>

        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  },
  // --- Lucide Mappings ---
  alertCircle: AlertCircle,
  warning: AlertTriangle,
  arrowRight: ArrowRight,
  check: Check,
  checks: CheckCheck,
  circleCheck: CircleCheck,
  close: X,
  cross: X,
  clock: Clock,
  charts: AreaChart,
  code: Code,
  dots: MoreHorizontal,
  ellipsis: MoreVertical,
  externalLink: ExternalLink,
  help: HelpCircle,
  info: Info,
  spinner: Loader2,
  search: Search,
  settings: Settings,
  trash: Trash2,

  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  chevronsDown: ChevronsDown,
  chevronsLeft: ChevronsLeft,
  chevronsRight: ChevronsRight,
  chevronsUpDown: ChevronsUpDown,

  dashboard: LayoutDashboard,
  kanban: Kanban,
  panelLeft: PanelLeft,

  user: User,
  user2: UserCircle,
  account: UserCircle,
  profile: User,
  employee: UserMinus,
  userPen: UserCog,
  teams: Users,

  logo: Command,

  chat: MessageSquare,
  notification: Bell,
  phone: Phone,
  video: Video,
  send: Send,
  paperclip: Paperclip,
  package: Box,
  briefcase: Briefcase,
  syringe: Syringe,
  bookOpen: BookOpen,
  globe: Globe,
  flask: FlaskRoundIcon,
  page: File,
  post: FileText,
  fileTypePdf: FileText, // Lucide doesn't have specific PDF/Doc/Xls in core
  fileTypeDoc: FileText,
  fileTypeXls: FileText,
  fileZip: FileJson,
  media: ImageIcon,
  music: Music,
  add: Plus,
  edit: Pencil,
  upload: Upload,
  share: Share,
  mail: Mail,
  login: LogIn,
  logout: LogOut,
  gripVertical: GripVertical,

  circle: Circle,
  circleX: CircleX,
  plusCircle: CirclePlus,
  xCircle: CircleX,
  minus: Minus,

  sun: Sun,
  moon: Moon,
  brightness: SunMedium,
  laptop: Laptop,
  palette: Palette,

  billing: CreditCard,
  creditCard: CreditCard,
  product: Box,
  pro: Crown,
  exclusive: Star,
  sparkles: Sparkles,
  badgeCheck: BadgeCheck,
  lock: Lock,

  trendingDown: TrendingDown,
  trendingUp: TrendingUp,
  eyeOff: EyeOff,
  adjustments: SlidersHorizontal,

  bold: Bold,
  italic: Italic,
  home: Home,
  calendar: Calendar,
  users: Users,
  logOut: LogOut,

  // --- User & Auth ---
  underline: Underline,
  text: Type,
  toastSuccess: CircleCheck,
  toastInfo: Info,
  toastWarning: AlertTriangle,
  toastError: CircleX,
  toastLoading: Loader2,
  prescription: Code,
  pizza: Pizza,
  workspace: Folder,
  forms: ClipboardX,
  slash: Slash,
  galleryVerticalEnd: Layers,
  sidebar: PanelLeft,
  moreHorizontal: MoreHorizontal,
};
