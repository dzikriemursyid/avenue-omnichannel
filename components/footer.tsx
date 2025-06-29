export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-0 transition-all duration-200 ease-linear">
            <div className="flex h-14 items-center px-6">
                <p className="text-sm text-muted-foreground">
                    © {currentYear} Avenue Developments. All rights reserved.
                </p>
            </div>
        </footer>
    )
} 