import React, { useEffect } from 'react';

import {devtools} from "valtio/utils"
import './index.css';
import Pages from './Pages';
import { actions, state } from './state';
import { useSnapshot } from 'valtio';
import Loader from './components/ui/Loader';
import { getTokenPayload } from './util';
import SnackBar from './components/ui/SnackBar';

devtools(state, { name: 'app state' })
const App: React.FC = () => {
    const currentState = useSnapshot(state)
    
    useEffect(() => {
        actions.startLoading()

        const accessToken = localStorage.getItem('accessToken')

        if (!accessToken) {
            actions.stopLoading()
            return
        }

        const { exp: tokenExp } = getTokenPayload(accessToken)
        const currentTime = Date.now() / 1000

        if (tokenExp < currentTime - 10) {
            localStorage.removeItem('accessToken')
            actions.stopLoading()
            return
        }

        actions.setPollAccessToken(accessToken)
        actions.initializeSocket()
    }, [])

    useEffect(() => {
        const myId = currentState.me?.id

        if(myId && currentState.socket?.connected && !currentState.poll?.participants[myId]) actions.startOver()
    }, [currentState.poll?.participants])

    return (
        <>
            <Loader isLoading={currentState.isLoading} color='orange' width={120} />
            {currentState.wsErrors.map((error) => (
                <SnackBar
                    key={error.id}
                    type='error'
                    title={error.type}
                    message={error.message}
                    show={true}
                    onClose={() => actions.removeWsError(error.id)}
                    autoCloseDuration={5000}
                />
            ))}
            <Pages />
        </>
    )
}

export default App;
