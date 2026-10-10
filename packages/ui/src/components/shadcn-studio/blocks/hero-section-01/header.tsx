import Logo from "@pedia/ui/assets/svg/logo";
import { Button } from "@pedia/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pedia/ui/components/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@pedia/ui/components/navigation-menu";
import { cn } from "@pedia/ui/lib/utils";
import { MenuIcon } from "lucide-react";

export type NavigationSection = {
  title: string;
  href: string;
};

type HeaderProps = {
  navigationData: NavigationSection[];
  className?: string;
};

function Header({ navigationData, className }: HeaderProps) {
  return (
    <header
      className={cn("bg-background sticky top-0 z-50 h-16 border-b", className)}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/#">
          <Logo className="gap-3" />
        </a>

        {/* Navigation */}
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList className="flex-wrap justify-start gap-0">
            {navigationData.map((navItem) => (
              <NavigationMenuItem key={navItem.title}>
                <NavigationMenuLink
                  className="text-muted-foreground hover:text-primary bg-transparent! px-3 py-1.5 text-base! font-medium"
                  href={navItem.href}
                >
                  {navItem.title}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Login button (desktop) */}
        <Button
          className="max-md:hidden"
          nativeButton={false}
          render={<a aria-label="Login" href="/#" />}
          size="lg"
        >
          Login
        </Button>

        {/* and */}
        <Button
          nativeButton={false}
          render={<a aria-label="Login" href="/#" />}
          size="lg"
        >
          Login
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon-lg" variant="outline" />}
          >
            <MenuIcon />
            <span className="sr-only">Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {navigationData.map((item, index) => (
              <DropdownMenuItem key={index}>
                <a href={item.href}>{item.title}</a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
