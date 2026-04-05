import { useLocation } from 'react-router-dom';
import { Radio } from 'lucide-react';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="flex items-center justify-center p-6 h-full">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="space-y-2">
                    <div className="h-16 w-16 mx-auto rounded-sm border border-destructive/30 bg-destructive/10 flex items-center justify-center">
                        <Radio className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="text-4xl font-bold font-display text-destructive tracking-wider">404</h1>
                    <div className="h-px w-16 bg-border mx-auto"></div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-sm font-semibold font-display tracking-widest text-foreground uppercase">
                        SIGNAL LOST
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                        Target <span className="text-accent">"/{pageName}"</span> not found on this terminal.
                    </p>
                </div>

                <button
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center px-4 py-2 text-xs font-mono tracking-wider text-primary border border-primary/30 rounded-sm bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                    RETURN TO SITREP
                </button>
            </div>
        </div>
    );
}