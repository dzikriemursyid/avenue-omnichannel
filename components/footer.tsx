export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-0">
            <div className="container flex h-14 items-center">
                <p className="text-sm text-muted-foreground">
                    © {currentYear} Avenue Developments. All rights reserved.
                </p>
            </div>
        </footer>
    )
} 